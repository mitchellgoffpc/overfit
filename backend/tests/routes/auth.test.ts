import {
  API_BASE,
  EMAIL_IN_USE_ERROR,
  CREDENTIALS_INVALID_ERROR,
  SESSION_INVALID_ERROR,
  USERNAME_IN_USE_ERROR
} from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";

async function getWithToken(app: ReturnType<typeof createApp>, path: string, token: string, status = 200) {
  return request(app)
    .get(path)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);
}

async function getWithCookie(app: ReturnType<typeof createApp>, path: string, cookie: string, status = 200) {
  return request(app)
    .get(path)
    .set("Cookie", cookie)
    .expect(status);
}

async function postWithCookie(app: ReturnType<typeof createApp>, path: string, cookie: string, status = 200) {
  return request(app)
    .post(path)
    .set("Cookie", cookie)
    .expect(status);
}

async function post(app: ReturnType<typeof createApp>, path: string, payload: Record<string, unknown>, status = 200) {
  return request(app)
    .post(`${API_BASE}/${path}`)
    .send(payload)
    .expect(status);
}

const getSetCookie = (response: { headers: Record<string, string | string[] | undefined> }): string | undefined => {
  const cookie = response.headers["set-cookie"];
  return Array.isArray(cookie) ? cookie[0] : cookie;
};

describe("auth routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
  });

  it("registers, logs in, and returns current user", async () => {
    const register = await post(app, "auth/register", { email: "sam@example.com", handle: "sam", password: "password123" });
    const registerBody = register.body as { user: { id: string; email: string; handle: string }; session: { token: string } };
    const registerCookie = getSetCookie(register);
    expect(registerBody.user).toMatchObject({ email: "sam@example.com", handle: "sam" });
    expect(typeof registerBody.session.token).toBe("string");
    expect(registerCookie).toContain(`underfit_session=${registerBody.session.token}`);

    const login = await post(app, "auth/login", { email: "sam@example.com", password: "password123" });
    const loginBody = login.body as { user: { id: string }; session: { token: string } };
    const loginCookie = getSetCookie(login);
    const token = loginBody.session.token;
    expect(loginBody.user.id).toBe(registerBody.user.id);
    expect(loginCookie).toContain(`underfit_session=${token}`);

    const current = await getWithCookie(app, `${API_BASE}/me`, loginCookie ?? "");
    expect((current.body as { id: string }).id).toBe(registerBody.user.id);
  });

  it("rejects invalid credentials and expires sessions on logout", async () => {
    await post(app, "auth/register", { email: "jules@example.com", handle: "jules", password: "password123" });

    const badLogin = await post(app, "auth/login", { email: "jules@example.com", password: "bad" }, 401);
    expect(badLogin.body).toMatchObject({ error: CREDENTIALS_INVALID_ERROR });

    const login = await post(app, "auth/login", { email: "jules@example.com", password: "password123" });
    const loginCookie = getSetCookie(login) ?? "";

    const logout = await postWithCookie(app, `${API_BASE}/auth/logout`, loginCookie);
    expect(logout.body).toMatchObject({ status: "ok" });
    expect(getSetCookie(logout)).toContain("underfit_session=;");

    const current = await getWithCookie(app, `${API_BASE}/me`, loginCookie, 401);
    expect(current.body).toMatchObject({ error: SESSION_INVALID_ERROR });
  });

  it("accepts cookie authentication alongside bearer api-key auth", async () => {
    const login = await post(app, "auth/register", { email: "cookie@example.com", handle: "cookie", password: "password123" });
    const cookie = getSetCookie(login) ?? "";

    const current = await getWithCookie(app, `${API_BASE}/me`, cookie);
    expect((current.body as { handle: string }).handle).toBe("cookie");

    const created = await request(app).post(`${API_BASE}/me/api-keys`).set("Cookie", cookie).send({ label: "test" }).expect(200);
    const currentWithApiKey = await getWithToken(app, `${API_BASE}/me`, (created.body as { token: string }).token);
    expect((currentWithApiKey.body as { handle: string }).handle).toBe("cookie");
  });

  it("rejects duplicate handles and emails", async () => {
    await post(app, "auth/register", { email: "dup@example.com", handle: "dup", password: "password123" });
    const emailDup = await post(app, "auth/register", { email: "dup@example.com", handle: "test", password: "password123" }, 409);
    expect(emailDup.body).toMatchObject({ error: EMAIL_IN_USE_ERROR });
    const handleDup = await post(app, "auth/register", { email: "second@example.com", handle: "dup", password: "password123" }, 409);
    expect(handleDup.body).toMatchObject({ error: USERNAME_IN_USE_ERROR });
  });

  it("rejects invalid emails, handles, and passwords", async () => {
    const badEmails = ["no-at", "bad@", "@bad.com", "bad@com", "bad@.com"];
    const badUsernames = ["-bad", "bad-", "bad--name", "bad name", "bad_name"];
    const badPasswords = ["short", "allletters", "12345678"];

    for (const email of badEmails) {
      const badEmail = await post(app, "auth/register", { email, handle: "valid-user", password: "password123" }, 400);
      expect(badEmail.body).toMatchObject({ error: "email: Invalid input" });
    }
    for (const handle of badUsernames) {
      const badHandle = await post(app, "auth/register", { email: "bad@example.com", handle, password: "password123" }, 400);
      expect(badHandle.body).toMatchObject({ error: "handle: Invalid input" });
    }
    for (const password of badPasswords) {
      const badPassword = await post(app, "auth/register", { email: "pw@example.com", handle: "valid-user", password }, 400);
      expect(badPassword.body).toMatchObject({ error: "password: Invalid input" });
    }
  });

  it("rejects expired sessions and clears them", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
      const register = await post(app, "auth/register", { email: "expired@example.com", handle: "expired", password: "password123" });
      const registerCookie = getSetCookie(register) ?? "";

      vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 31);
      const current = await getWithCookie(app, `${API_BASE}/me`, registerCookie, 401);
      expect(current.body).toMatchObject({ error: SESSION_INVALID_ERROR });
    } finally {
      vi.useRealTimers();
    }
  });
});
