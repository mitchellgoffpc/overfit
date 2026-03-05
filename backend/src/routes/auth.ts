import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

import {
  EMAIL_IN_USE_ERROR,
  CREDENTIALS_INVALID_ERROR,
  SESSION_INVALID_ERROR,
  SESSION_TOKEN_REQUIRED_ERROR,
  SESSION_USER_INVALID_ERROR,
  USERNAME_IN_USE_ERROR,
  testEmail,
  testPassword,
  testHandle
} from "@overfit/types";
import type { Session, User, UserAuth } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { handleExists } from "db/repositories/accounts";
import { getSession, upsertSession, deleteSession } from "db/repositories/sessions";
import { getUserAuth, upsertUserAuth } from "db/repositories/user-auth";
import { emailExists, findUserByEmail, getUser, upsertUser } from "db/repositories/users";
import { nowIso } from "routes/helpers";
import type { ErrorResponse, RouteApp } from "routes/helpers";

const PASSWORD_ITERATIONS = 310000;
const PASSWORD_DIGEST = "sha256";
const PASSWORD_BYTES = 32;
const SALT_BYTES = 16;
const SESSION_BYTES = 32;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

interface AuthSession {
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface AuthResponse {
  user: User;
  session: AuthSession;
}

interface RegisterPayload {
  email?: string;
  handle?: string;
  password?: string;
}

interface LoginPayload {
  email?: string;
  password?: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashPassword = (password: string, salt: string, iterations: number, digest: string) => (
  pbkdf2Sync(password, salt, iterations, PASSWORD_BYTES, digest).toString("hex")
);

const verifyPassword = (password: string, auth: UserAuth) => {
  const hashed = hashPassword(password, auth.passwordSalt, auth.passwordIterations, auth.passwordDigest);
  const left = Buffer.from(hashed, "hex");
  const right = Buffer.from(auth.passwordHash, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

const resolveSessionToken = (value?: string) => {
  if (!value) { return undefined; }
  const [type, token] = value.split(" ");
  return type?.toLowerCase() === "bearer" && token ? token : value;
};

const getSessionToken = (headers: Record<string, string | string[] | undefined>) => {
  const headerValue = Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization;
  const sessionHeader = Array.isArray(headers["x-session-token"]) ? headers["x-session-token"][0] : headers["x-session-token"];
  const raw = resolveSessionToken(headerValue) ?? resolveSessionToken(sessionHeader);
  return raw?.trim();
};

export function registerAuthRoutes(app: RouteApp, apiBase: string, db: Database): void {
  const register: RequestHandler<Record<string, string>, AuthResponse | ErrorResponse, RegisterPayload | undefined> = async (req, res) => {
    const rawEmail = req.body?.email;
    const email = rawEmail ? normalizeEmail(rawEmail) : "";
    const handle = req.body?.handle?.trim() ?? "";
    const password = req.body?.password ?? "";

    const missingFields = Object.entries({ email, handle, password }).filter(([, value]) => !value).map(([label]) => label);
    if (missingFields.length > 0) {
      res.status(400).json({ error: `Registration fields are required: ${missingFields.join(", ")}` });
      return;
    }

    const emailError = testEmail(email);
    const handleError = testHandle(handle);
    const passwordError = testPassword(password);

    if (emailError) {
      res.status(400).json({ error: emailError });
    } else if (handleError) {
      res.status(400).json({ error: handleError });
    } else if (passwordError) {
      res.status(400).json({ error: passwordError });
    } else if (await handleExists(db, handle)) {
      res.status(409).json({ error: USERNAME_IN_USE_ERROR });
    } else if (await emailExists(db, email)) {
      res.status(409).json({ error: EMAIL_IN_USE_ERROR });
    } else {
      const timestamp = nowIso();
      const user: User = {
        id: randomBytes(16).toString("hex"),
        email,
        handle,
        displayName: handle,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const salt = randomBytes(SALT_BYTES).toString("hex");
      const passwordHash = hashPassword(password, salt, PASSWORD_ITERATIONS, PASSWORD_DIGEST);
      const auth: UserAuth = {
        id: user.id,
        passwordHash,
        passwordSalt: salt,
        passwordIterations: PASSWORD_ITERATIONS,
        passwordDigest: PASSWORD_DIGEST,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      const token = randomBytes(SESSION_BYTES).toString("base64url");
      const session: Session = { id: token, userId: user.id, createdAt, expiresAt };

      await upsertUser(db, user);
      await upsertUserAuth(db, auth);
      await upsertSession(db, session);

      res.json({ user, session: { token, createdAt, expiresAt } });
    }
  };

  const login: RequestHandler<Record<string, string>, AuthResponse | ErrorResponse, LoginPayload | undefined> = async (req, res) => {
    const emailRaw = req.body?.email;
    const email = emailRaw ? normalizeEmail(emailRaw) : "";
    const password = req.body?.password ?? "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = await findUserByEmail(db, email);
    if (!user) {
      res.status(401).json({ error: CREDENTIALS_INVALID_ERROR });
      return;
    }

    const auth = await getUserAuth(db, user.id);
    if (!auth || !verifyPassword(password, auth)) {
      res.status(401).json({ error: CREDENTIALS_INVALID_ERROR });
      return;
    }

    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const token = randomBytes(SESSION_BYTES).toString("base64url");
    const session: Session = { id: token, userId: user.id, createdAt, expiresAt };

    await upsertSession(db, session);
    res.json({ user, session: { token, createdAt, expiresAt } });
  };

  const logout: RequestHandler<Record<string, string>, { status: "ok" } | ErrorResponse> = async (req, res) => {
    const token = getSessionToken(req.headers);
    if (!token) {
      res.status(401).json({ error: SESSION_TOKEN_REQUIRED_ERROR });
      return;
    }
    const session = await getSession(db, token);
    if (!session) {
      res.status(401).json({ error: SESSION_INVALID_ERROR });
      return;
    }
    await deleteSession(db, token);
    res.json({ status: "ok" });
  };

  const me: RequestHandler<Record<string, string>, User | ErrorResponse> = async (req, res) => {
    const token = getSessionToken(req.headers);
    if (!token) {
      res.status(401).json({ error: SESSION_TOKEN_REQUIRED_ERROR });
      return;
    }
    const session = await getSession(db, token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      if (session) { await deleteSession(db, token); }
      res.status(401).json({ error: SESSION_INVALID_ERROR });
      return;
    }
    const user = await getUser(db, session.userId);
    if (!user) {
      res.status(401).json({ error: SESSION_USER_INVALID_ERROR });
      return;
    }
    res.json(user);
  };

  app.post(`${apiBase}/auth/register`, register);
  app.post(`${apiBase}/auth/login`, login);
  app.post(`${apiBase}/auth/logout`, logout);
  app.get(`${apiBase}/auth/me`, me);
}
