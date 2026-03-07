import request from "supertest";
import { describe, expect, it } from "vitest";

import { apiBase, createTestApp, put } from "@overfit/backend/tests/routes/helpers";

describe("accounts routes", () => {
  it("checks whether a handle exists", async () => {
    const app = await createTestApp();
    await put(app, "users", "user-1", { email: "ada@example.com", handle: "Ada Lovelace" });

    const missing = await request(app).get(`${apiBase}/accounts/handle-exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "Handle is required" });

    const exists = await request(app).get(`${apiBase}/accounts/handle-exists`).query({ handle: "Ada Lovelace" }).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${apiBase}/accounts/handle-exists`).query({ handle: "Grace Hopper" }).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });

  it("fetches an account by handle", async () => {
    const app = await createTestApp();
    await put(app, "users", "user-1", { email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });

    const userResponse = await request(app).get(`${apiBase}/accounts/ada`).expect(200);
    expect(userResponse.body).toMatchObject({ id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", type: "USER" });

    const orgResponse = await request(app).get(`${apiBase}/accounts/core`).expect(200);
    expect(orgResponse.body).toMatchObject({ id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });

    const missing = await request(app).get(`${apiBase}/accounts/unknown`).expect(404);
    expect(missing.body).toMatchObject({ error: "Account not found" });
  });
});
