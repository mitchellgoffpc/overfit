import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

import { PASSWORD_HINT, USERNAME_HINT, testEmail, testPassword, testUsername } from "@overfit/types";
import type { Session, User, UserAuth } from "@overfit/types";
import type { RequestHandler } from "express";

import type { ErrorResponse, RouteApp } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

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
  username?: string;
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
  const raw = resolveSessionToken(headerValue) ?? resolveSessionToken(Array.isArray(headers["x-session-token"]) ? headers["x-session-token"][0] : headers["x-session-token"]);
  return raw?.trim();
};

export function registerAuthRoutes(app: RouteApp, apiBase: string, users: EntityStore<User>, userAuth: EntityStore<UserAuth>, sessions: EntityStore<Session>): void {
  const register: RequestHandler<Record<string, string>, AuthResponse | ErrorResponse, RegisterPayload> = (req, res) => {
    const email = req.body.email ? normalizeEmail(req.body.email) : "";
    const username = req.body.username?.trim() ?? "";
    const password = req.body.password ?? "";

    const missingFields = Object.entries({ email, username, password }).filter(([, value]) => !value).map(([label]) => label);
    if (missingFields.length > 0) {
      res.status(400).json({ error: `Registration fields are required: ${missingFields.join(", ")}` });
    } else if (!testEmail(email)) {
      res.status(400).json({ error: "Email must be valid" });
    } else if (!testUsername(username)) {
      res.status(400).json({ error: USERNAME_HINT });
    } else if (!testPassword(password)) {
      res.status(400).json({ error: PASSWORD_HINT });
    } else if (users.list().find((user) => user.username.toLowerCase() === username.toLowerCase())) {
      res.status(409).json({ error: "Username already in use" });
    } else if (users.list().find((user) => user.email.toLowerCase() === email)) {
      res.status(409).json({ error: "Email already in use" });
    } else {
      const timestamp = nowIso();
      const user: User = {
        id: randomBytes(16).toString("hex"),
        email,
        username,
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

      users.upsert(user);
      userAuth.upsert(auth);
      sessions.upsert(session);

      res.json({ user, session: { token, createdAt, expiresAt } });
    }
  };

  const login: RequestHandler<Record<string, string>, AuthResponse | ErrorResponse, LoginPayload> = (req, res) => {
    const email = req.body.email ? normalizeEmail(req.body.email) : "";
    const password = req.body.password ?? "";

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const user = users.list().find((candidate) => candidate.email.toLowerCase() === email);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const auth = userAuth.get(user.id);
    if (!auth || !verifyPassword(password, auth)) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const token = randomBytes(SESSION_BYTES).toString("base64url");
    const session: Session = { id: token, userId: user.id, createdAt, expiresAt };

    sessions.upsert(session);
    res.json({ user, session: { token, createdAt, expiresAt } });
  };

  const logout: RequestHandler<Record<string, string>, { status: "ok" } | ErrorResponse> = (req, res) => {
    const token = getSessionToken(req.headers);
    if (!token) {
      res.status(401).json({ error: "Session token is required" });
      return;
    }
    const session = sessions.get(token);
    if (!session) {
      res.status(401).json({ error: "Session is invalid or expired" });
      return;
    }
    sessions.delete(token);
    res.json({ status: "ok" });
  };

  const me: RequestHandler<Record<string, string>, User | ErrorResponse> = (req, res) => {
    const token = getSessionToken(req.headers);
    if (!token) {
      res.status(401).json({ error: "Session token is required" });
      return;
    }
    const session = sessions.get(token);
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
      if (session) { sessions.delete(token); }
      res.status(401).json({ error: "Session is invalid or expired" });
      return;
    }
    const user = users.get(session.userId);
    if (!user) {
      res.status(401).json({ error: "Session is invalid" });
      return;
    }
    res.json(user);
  };

  app.post(`${apiBase}/auth/register`, register);
  app.post(`${apiBase}/auth/login`, login);
  app.post(`${apiBase}/auth/logout`, logout);
  app.get(`${apiBase}/auth/me`, me);
}
