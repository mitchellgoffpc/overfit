import request from "supertest";
import { describe, expect, it } from "vitest";

import { apiBase, assertNotFound, assertRejectCases, createTestApp, get, put } from "@overfit/backend/tests/routes/helpers";

describe("users routes", () => {
  it("upserts and fetches a user", async () => {
    const app = await createTestApp();
    const userPayload = { email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" };
    const upsertResponse = await put(app, "users", "user-1", userPayload);
    expect(upsertResponse.body).toMatchObject({ id: "user-1", ...userPayload });
    const getResponse = await get(app, "users", "user-1");
    expect(getResponse.body).toMatchObject({ id: "user-1", ...userPayload });
  });

  it("rejects unknown users", async () => {
    const app = await createTestApp();
    await assertNotFound(app, "users", "missing", "User not found");
  });

  it("rejects missing required fields", async () => {
    const app = await createTestApp();
    const cases = [
      { payload: {}, error: "User fields are required: email, handle" },
      { payload: { handle: "ada" }, error: "User fields are required: email" },
      { payload: { email: "ada@example.com" }, error: "User fields are required: handle" }
    ];
    await assertRejectCases(app, "users", cases);
  });

  it("lists user organizations", async () => {
    const app = await createTestApp();
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });
    await put(app, "users", "user-1", { email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });
    await request(app).put(`${apiBase}/organizations/org-1/members/user-1`).send({ role: "ADMIN" }).expect(200);
    const response = await request(app).get(`${apiBase}/users/user-1/memberships`).expect(200);
    expect(response.body).toMatchObject([
      { id: "org-1", handle: "core", displayName: "Core", role: "ADMIN" }
    ]);
  });

  it("checks whether an email exists", async () => {
    const app = await createTestApp();
    await put(app, "users", "user-1", { email: "ada@example.com", handle: "Ada Lovelace" });

    const missing = await request(app).get(`${apiBase}/users/email-exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "Email is required" });

    const exists = await request(app).get(`${apiBase}/users/email-exists`).query({ email: "ada@example.com" }).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${apiBase}/users/email-exists`).query({ email: "grace@example.com" }).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });
});
