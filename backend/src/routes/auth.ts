import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

import {
  API_BASE,
  EMAIL_IN_USE_ERROR,
  CREDENTIALS_INVALID_ERROR,
  SESSION_INVALID_ERROR,
  SESSION_TOKEN_REQUIRED_ERROR,
  USERNAME_IN_USE_ERROR,
  testEmail,
  testPassword,
  testHandle
} from "@underfit/types";
import type { User, UserAuth } from "@underfit/types";
import type { RequestHandler, Response } from "express";
import { z } from "zod";

import type { Database } from "db";
import { getAccount } from "repositories/accounts";
import { getUserByApiKey } from "repositories/api-keys";
import { getSession, upsertSession, deleteSession } from "repositories/sessions";
import { getUserAuth, upsertUserAuth } from "repositories/user-auth";
import { createUser, getUserByEmail, getUser } from "repositories/users";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const PASSWORD_ITERATIONS = 310000;
const PASSWORD_DIGEST = "sha256";
const PASSWORD_BYTES = 32;
const SALT_BYTES = 16;
const SESSION_BYTES = 32;
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SESSION_COOKIE_NAME = "underfit_session";

const RegisterPayloadSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(1).refine(value => !testEmail(value)),
  handle: z.string().trim().toLowerCase().min(1).refine(value => !testHandle(value)),
  password: z.string().min(1).refine(value => !testPassword(value))
});

const LoginPayloadSchema = z.strictObject({
  email: z.string().trim().toLowerCase().min(1),
  password: z.string().min(1)
});

interface AuthSession {
  token: string;
  createdAt: string;
  expiresAt: string;
}

interface AuthResponse {
  user: User;
  session: AuthSession;
}

type RegisterPayload = z.infer<typeof RegisterPayloadSchema>;
type LoginPayload = z.infer<typeof LoginPayloadSchema>;

const hashPassword = (password: string, salt: string, iterations: number, digest: string) => (
  pbkdf2Sync(password, salt, iterations, PASSWORD_BYTES, digest).toString("hex")
);

const verifyPassword = (password: string, auth: UserAuth) => {
  const hashed = hashPassword(password, auth.passwordSalt, auth.passwordIterations, auth.passwordDigest);
  const left = Buffer.from(hashed, "hex");
  const right = Buffer.from(auth.passwordHash, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

const resolveBearerToken = (value?: string) => {
  if (!value) { return undefined; }
  const [type, token] = value.split(" ");
  return type?.toLowerCase() === "bearer" && token ? token : undefined;
};

const setSessionCookie = (res: Response, token: string, expiresAt: string) => {
  res.cookie(SESSION_COOKIE_NAME, token, { path: "/", httpOnly: true, sameSite: "lax", expires: new Date(expiresAt) });
};

const clearSessionCookie = (res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/", httpOnly: true, sameSite: "lax" });
};

const getBearerToken = (headers: Record<string, string | string[] | undefined>) => {
  const headerValue = Array.isArray(headers["authorization"]) ? (headers["authorization"][0] ?? "") : headers["authorization"];
  const raw = resolveBearerToken(headerValue);
  return raw?.trim();
};

const getSessionToken = (cookies: Record<string, string>) => {
  const raw = cookies[SESSION_COOKIE_NAME];
  return raw?.trim();
};

export const requireAuth = (db: Database): RequestHandler => async (req, res, next) => {
  const apiKeyToken = getBearerToken(req.headers);
  if (apiKeyToken) {
    const user = await getUserByApiKey(db, apiKeyToken);
    if (!user) {
      res.status(401).json({ error: SESSION_INVALID_ERROR });
      return;
    }

    req.user = user;
    next();
    return;
  }

  const token = getSessionToken(req.cookies as Record<string, string>);
  if (!token) {
    clearSessionCookie(res);
    res.status(401).json({ error: SESSION_TOKEN_REQUIRED_ERROR });
    return;
  }

  const session = await getSession(db, token);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    if (session) { await deleteSession(db, token); }
    clearSessionCookie(res);
    res.status(401).json({ error: SESSION_INVALID_ERROR });
    return;
  }

  const user = await getUser(db, session.userId);
  if (!user) {
    res.status(401).json({ error: SESSION_INVALID_ERROR });
  } else {
    req.user = user;
    next();
  }
};

export function registerAuthRoutes(app: RouteApp, db: Database): void {
  const register: RouteHandler<Record<string, string>, AuthResponse, RegisterPayload> = async (req, res) => {
    const { success, error, data } = RegisterPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (await getAccount(db, data.handle)) {
      res.status(409).json({ error: USERNAME_IN_USE_ERROR });
    } else if (await getUserByEmail(db, data.email)) {
      res.status(409).json({ error: EMAIL_IN_USE_ERROR });
    } else {
      const user = await createUser(db, { email: data.email, handle: data.handle, name: data.handle, bio: null });

      const salt = randomBytes(SALT_BYTES).toString("hex");
      const passwordHash = hashPassword(data.password, salt, PASSWORD_ITERATIONS, PASSWORD_DIGEST);
      await upsertUserAuth(db, {
        id: user.id,
        passwordHash,
        passwordSalt: salt,
        passwordIterations: PASSWORD_ITERATIONS,
        passwordDigest: PASSWORD_DIGEST
      });

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      const token = randomBytes(SESSION_BYTES).toString("base64url");
      const session = await upsertSession(db, { id: token, userId: user.id, expiresAt });

      setSessionCookie(res, token, expiresAt);
      res.json({ user, session: { token, createdAt: session.createdAt, expiresAt } });
    }
  };

  const login: RouteHandler<Record<string, string>, AuthResponse, LoginPayload> = async (req, res) => {
    const { success, error, data } = LoginPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const user = await getUserByEmail(db, data.email);
    if (!user) {
      res.status(401).json({ error: CREDENTIALS_INVALID_ERROR });
      return;
    }

    const auth = await getUserAuth(db, user.id);
    if (!auth || !verifyPassword(data.password, auth)) {
      res.status(401).json({ error: CREDENTIALS_INVALID_ERROR });
      return;
    }

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const token = randomBytes(SESSION_BYTES).toString("base64url");
    const session = await upsertSession(db, { id: token, userId: user.id, expiresAt });
    setSessionCookie(res, token, expiresAt);
    res.json({ user, session: { token, createdAt: session.createdAt, expiresAt } });
  };

  const logout: RouteHandler<Record<string, string>, { status: "ok" }> = async (req, res) => {
    const token = getSessionToken(req.cookies as Record<string, string>);
    if (!token) {
      clearSessionCookie(res);
      res.status(401).json({ error: SESSION_TOKEN_REQUIRED_ERROR });
      return;
    }

    const session = await getSession(db, token);
    if (!session) {
      clearSessionCookie(res);
      res.status(401).json({ error: SESSION_INVALID_ERROR });
      return;
    }

    await deleteSession(db, token);
    clearSessionCookie(res);
    res.json({ status: "ok" });
  };

  app.post(`${API_BASE}/auth/register`, register);
  app.post(`${API_BASE}/auth/login`, login);
  app.post(`${API_BASE}/auth/logout`, logout);
}
