import {
  EMAIL_IN_USE_ERROR,
  EMAIL_INVALID_ERROR,
  CREDENTIALS_INVALID_ERROR,
  SESSION_INVALID_ERROR,
  testPassword,
  USERNAME_HINT,
  USERNAME_IN_USE_ERROR
} from "@overfit/types";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { apiBase, createTestApp, post } from "@overfit/backend/tests/routes/helpers";
import type { RouteApp } from "routes/helpers";

async function getWithToken(app: RouteApp, path: string, token: string, status = 200) {
  return request(app)
    .get(path)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);
}

async function postWithToken(app: RouteApp, path: string, token: string, status = 200) {
  return request(app)
    .post(path)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);
}

describe("auth routes", () => {
  it("registers, logs in, and returns current user", async () => {
    const app = await createTestApp();
    const register = await post(app, "auth/register", { email: "sam@example.com", username: "sam", password: "password123" });
    const registerBody = register.body as { user: { id: string; email: string; username: string }; session: { token: string } };
    expect(registerBody.user).toMatchObject({ email: "sam@example.com", username: "sam" });
    expect(typeof registerBody.session.token).toBe("string");

    const login = await post(app, "auth/login", { email: "sam@example.com", password: "password123" });
    const loginBody = login.body as { user: { id: string }; session: { token: string } };
    const token = loginBody.session.token;
    expect(loginBody.user.id).toBe(registerBody.user.id);

    const current = await getWithToken(app, `${apiBase}/auth/me`, token);
    expect((current.body as { id: string }).id).toBe(registerBody.user.id);
  });

  it("rejects invalid credentials and expires sessions on logout", async () => {
    const app = await createTestApp();
    await post(app, "auth/register", { email: "jules@example.com", username: "jules", password: "password123" });

    const badLogin = await post(app, "auth/login", { email: "jules@example.com", password: "bad" }, 401);
    expect(badLogin.body).toMatchObject({ error: CREDENTIALS_INVALID_ERROR });

    const login = await post(app, "auth/login", { email: "jules@example.com", password: "password123" });
    const loginBody = login.body as { session: { token: string } };
    const token = loginBody.session.token;

    const logout = await postWithToken(app, `${apiBase}/auth/logout`, token);
    expect(logout.body).toMatchObject({ status: "ok" });

    const current = await getWithToken(app, `${apiBase}/auth/me`, token, 401);
    expect(current.body).toMatchObject({ error: SESSION_INVALID_ERROR });
  });

  it("rejects duplicate usernames and emails", async () => {
    const app = await createTestApp();
    await post(app, "auth/register", { email: "dup@example.com", username: "dup", password: "password123" });
    const emailDup = await post(app, "auth/register", { email: "dup@example.com", username: "test", password: "password123" }, 409);
    expect(emailDup.body).toMatchObject({ error: EMAIL_IN_USE_ERROR });
    const usernameDup = await post(app, "auth/register", { email: "second@example.com", username: "dup", password: "password123" }, 409);
    expect(usernameDup.body).toMatchObject({ error: USERNAME_IN_USE_ERROR });
  });

  it("rejects invalid emails, usernames, and passwords", async () => {
    const app = await createTestApp();
    const badEmails = ["no-at", "bad@", "@bad.com", "bad@com", "bad@.com"];
    const badUsernames = ["-bad", "bad-", "bad--name", "bad name", "bad_name"];
    const badPasswords = ["short", "allletters", "12345678"];

    for (const email of badEmails) {
      const badEmail = await post(app, "auth/register", { email, username: "valid-user", password: "password123" }, 400);
      expect(badEmail.body).toMatchObject({ error: EMAIL_INVALID_ERROR });
    }
    for (const username of badUsernames) {
      const badUsername = await post(app, "auth/register", { email: "bad@example.com", username, password: "password123" }, 400);
      expect(badUsername.body).toMatchObject({ error: USERNAME_HINT });
    }
    for (const password of badPasswords) {
      const badPassword = await post(app, "auth/register", { email: "pw@example.com", username: "valid-user", password }, 400);
      const passwordError = testPassword(password);
      expect(passwordError).toBeTruthy();
      expect(badPassword.body).toMatchObject({ error: passwordError });
    }
  });

  it("rejects expired sessions and clears them", async () => {
    const app = await createTestApp();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
      const register = await post(app, "auth/register", { email: "expired@example.com", username: "expired", password: "password123" });
      const registerBody = register.body as { session: { token: string } };
      const token = registerBody.session.token;

      vi.advanceTimersByTime(1000 * 60 * 60 * 24 * 31);
      const current = await getWithToken(app, `${apiBase}/auth/me`, token, 401);
      expect(current.body).toMatchObject({ error: SESSION_INVALID_ERROR });
    } finally {
      vi.useRealTimers();
    }
  });
});
