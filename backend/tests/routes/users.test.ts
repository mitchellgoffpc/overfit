import request from "supertest";
import { describe, expect, it } from "vitest";

import { apiBase, assertNotFound, assertRejectCases, createTestApp, get, put } from "@overfit/backend/tests/routes/helpers";

describe("users routes", () => {
  it("upserts and fetches a user", async () => {
    const app = createTestApp();
    const userPayload = { email: "ada@example.com", displayName: "Ada Lovelace" };
    const upsertResponse = await put(app, "users", "user-1", userPayload);
    expect(upsertResponse.body).toMatchObject({ id: "user-1", ...userPayload });
    const getResponse = await get(app, "users", "user-1");
    expect(getResponse.body).toMatchObject({ id: "user-1", ...userPayload });
  });

  it("rejects unknown users", async () => {
    const app = createTestApp();
    await assertNotFound(app, "users", "missing", "User not found");
  });

  it("rejects missing required fields", async () => {
    const app = createTestApp();
    const cases = [
      { payload: { displayName: "Ada Lovelace" }, error: "User email is required" },
      { payload: { email: "ada@example.com" }, error: "User displayName is required" }
    ];
    await assertRejectCases(app, "users", cases);
  });

  it("lists user organizations", async () => {
    const app = createTestApp();
    await put(app, "organizations", "org-1", { name: "Core", slug: "core" });
    await put(app, "users", "user-1", { email: "ada@example.com", displayName: "Ada Lovelace" });
    await request(app).put(`${apiBase}/organizations/org-1/members/user-1`).send({ role: "ADMIN" }).expect(200);
    const response = await request(app).get(`${apiBase}/users/user-1`).expect(200);
    expect(response.body).toMatchObject({
      id: "user-1",
      email: "ada@example.com",
      displayName: "Ada Lovelace",
      organizations: [{ id: "org-1", name: "Core", slug: "core", role: "ADMIN" }]
    });
  });
});
