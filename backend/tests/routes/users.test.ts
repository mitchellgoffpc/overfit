import { API_BASE } from "@overfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertOrganizationMember } from "repositories/organization-members.js";
import { upsertOrganization } from "repositories/organizations";
import { upsertUser } from "repositories/users";

describe("users routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertOrganization(db, { id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", type: "USER" });
    await upsertOrganizationMember(db, { organizationId: "org-1", userId: "user-1", role: "ADMIN" });
  });

  it("fetches a user", async () => {
    const getResponse = await request(app).get(`${API_BASE}/users/user-1`).expect(200);
    expect(getResponse.body).toMatchObject({ id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });
  });

  it("rejects unknown users", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });

  it("lists user organizations", async () => {
    const response = await request(app).get(`${API_BASE}/users/user-1/memberships`).expect(200);
    expect(response.body).toMatchObject([{ id: "org-1", handle: "core", displayName: "Core", role: "ADMIN" }]);
  });

  it("checks whether an email exists", async () => {
    const missing = await request(app).get(`${API_BASE}/users/email-exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "Email is required" });

    const exists = await request(app).get(`${API_BASE}/users/email-exists`).query({ email: "ada@example.com" }).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${API_BASE}/users/email-exists`).query({ email: "grace@example.com" }).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });
});
