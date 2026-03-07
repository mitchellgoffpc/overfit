import request from "supertest";
import { describe, expect, it } from "vitest";

import { API_BASE, assertNotFound, createTestApp, createTestDb, createUser, get, put } from "@overfit/backend/tests/routes/helpers";

describe("users routes", () => {
  it("fetches a user", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    const userPayload = { email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" };
    await createUser(db, { id: "user-1", ...userPayload });
    const getResponse = await get(app, "users", "user-1");
    expect(getResponse.body).toMatchObject({ id: "user-1", ...userPayload });
  });

  it("rejects unknown users", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await assertNotFound(app, "users", "missing", "User not found");
  });

  it("lists user organizations", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });
    await createUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });
    await request(app).put(`${API_BASE}/organizations/org-1/members/user-1`).send({ role: "ADMIN" }).expect(200);
    const response = await request(app).get(`${API_BASE}/users/user-1/memberships`).expect(200);
    expect(response.body).toMatchObject([
      { id: "org-1", handle: "core", displayName: "Core", role: "ADMIN" }
    ]);
  });

  it("checks whether an email exists", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await createUser(db, { id: "user-1", email: "ada@example.com", handle: "Ada Lovelace" });

    const missing = await request(app).get(`${API_BASE}/users/email-exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "Email is required" });

    const exists = await request(app).get(`${API_BASE}/users/email-exists`).query({ email: "ada@example.com" }).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${API_BASE}/users/email-exists`).query({ email: "grace@example.com" }).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });
});
