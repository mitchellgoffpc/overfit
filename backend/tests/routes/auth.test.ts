import request from "supertest";
import { describe, expect, it } from "vitest";

import { apiBase, createTestApp, post } from "@overfit/backend/tests/routes/helpers";
import type { Storage } from "storage";

async function getWithToken(app: ReturnType<typeof createTestApp>, path: string, token: string, status = 200) {
  return request(app)
    .get(path)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);
}

async function postWithToken(app: ReturnType<typeof createTestApp>, path: string, token: string, status = 200) {
  return request(app)
    .post(path)
    .set("Authorization", `Bearer ${token}`)
    .expect(status);
}

describe("auth routes", () => {
  it("registers, logs in, and returns current user", async () => {
    const app = createTestApp();
    const register = await post(app, "auth/register", { email: "sam@example.com", displayName: "Sam", password: "password123" });
    const registerBody = register.body as { user: { id: string; email: string; displayName: string }; session: { token: string } };
    expect(registerBody.user).toMatchObject({ email: "sam@example.com", displayName: "Sam" });
    expect(typeof registerBody.session.token).toBe("string");

    const login = await post(app, "auth/login", { email: "sam@example.com", password: "password123" });
    const loginBody = login.body as { user: { id: string }; session: { token: string } };
    const token = loginBody.session.token;
    expect(loginBody.user.id).toBe(registerBody.user.id);

    const current = await getWithToken(app, `${apiBase}/auth/me`, token);
    expect((current.body as { id: string }).id).toBe(registerBody.user.id);

  });

  it("rejects invalid credentials and expires sessions on logout", async () => {
    const app = createTestApp();
    await post(app, "auth/register", { email: "jules@example.com", displayName: "Jules", password: "password123" });

    const badLogin = await post(app, "auth/login", { email: "jules@example.com", password: "bad" }, 401);
    expect(badLogin.body).toMatchObject({ error: "Invalid credentials" });

    const login = await post(app, "auth/login", { email: "jules@example.com", password: "password123" });
    const loginBody = login.body as { session: { token: string } };
    const token = loginBody.session.token;

    const logout = await postWithToken(app, `${apiBase}/auth/logout`, token);
    expect(logout.body).toMatchObject({ status: "ok" });

    const current = await getWithToken(app, `${apiBase}/auth/me`, token, 401);
    expect(current.body).toMatchObject({ error: "Session is invalid or expired" });

  });

  it("rejects duplicate registration emails", async () => {
    const app = createTestApp();
    await post(app, "auth/register", { email: "dup@example.com", displayName: "Dup", password: "password123" });
    const duplicate = await post(app, "auth/register", { email: "dup@example.com", displayName: "Dup", password: "password123" }, 409);
    expect(duplicate.body).toMatchObject({ error: "Email already in use" });
  });

  it("rejects expired sessions and clears them", async () => {
    const app = createTestApp();
    const register = await post(app, "auth/register", { email: "expired@example.com", displayName: "Expired", password: "password123" });
    const registerBody = register.body as { session: { token: string } };
    const token = registerBody.session.token;

    const storage = (app as unknown as { locals: { storage: Storage } }).locals.storage;
    const session = storage.sessions.get(token);
    if (!session) { throw new Error("Missing session for test"); }
    storage.sessions.upsert({ ...session, expiresAt: "2000-01-01T00:00:00.000Z" });

    const current = await getWithToken(app, `${apiBase}/auth/me`, token, 401);
    expect(current.body).toMatchObject({ error: "Session is invalid or expired" });
    expect(storage.sessions.get(token)).toBeUndefined();
  });
});
