import { API_BASE } from "@underfit/types";
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
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertOrganizationMember(db, { organizationId: "org-1", userId: "user-1", role: "ADMIN" });
  });

  it("lists user organizations", async () => {
    const response = await request(app).get(`${API_BASE}/users/ada/memberships`).expect(200);
    expect(response.body).toMatchObject([{ id: "org-1", handle: "core", displayName: "Core", role: "ADMIN" }]);
  });

  it("rejects unknown users when listing memberships", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing/memberships`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });

  it("checks whether an email exists", async () => {
    const missing = await request(app).get(`${API_BASE}/emails/exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "Email is required" });

    const exists = await request(app).get(`${API_BASE}/emails/exists`).query({ email: "ada@example.com" }).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${API_BASE}/emails/exists`).query({ email: "grace@example.com" }).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });
});
