import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertOrganization } from "repositories/organizations";
import { upsertUser } from "repositories/users";

describe("organizations routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse(), db);
    await upsertOrganization(db, { id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
  });

  it("upserts an organization by handle", async () => {
    const response = await request(app).put(`${API_BASE}/organizations/core2`).send({ displayName: "Core2" }).expect(200);
    expect(response.body).toMatchObject({ handle: "core2", displayName: "Core2" });
  });

  it("upserts organizations by handle and preserves ids", async () => {
    const originalId = "org-1";
    const updated = await request(app).put(`${API_BASE}/organizations/core`).send({ displayName: "Core Team" }).expect(200);
    expect(updated.body).toMatchObject({ id: originalId, handle: "core", displayName: "Core Team" });
  });

  it("lists organization members", async () => {
    await request(app).put(`${API_BASE}/organizations/core/members/ada`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/core/members`).expect(200);
    expect(response.body).toMatchObject([
      { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", role: "MEMBER" }
    ]);
  });

  it("creates and deletes memberships", async () => {
    await request(app).put(`${API_BASE}/organizations/core/members/ada`).send({ role: "ADMIN" }).expect(200);
    await request(app).delete(`${API_BASE}/organizations/core/members/ada`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/core/members`).expect(200);
    expect(response.body).toEqual([]);
  });

  it("rejects invalid membership roles", async () => {
    const response = await request(app).put(`${API_BASE}/organizations/core/members/ada`).send({ role: "OWNER" }).expect(400);
    expect(response.body).toMatchObject({ error: "Organization role is invalid" });
  });

  it("rejects unknown orgs and users when creating memberships", async () => {
    const missingOrg = await request(app).put(`${API_BASE}/organizations/missing/members/ada`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).put(`${API_BASE}/organizations/core/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });
  });

  it("rejects unknown orgs, users, and memberships when deleting memberships", async () => {
    const missingOrg = await request(app).delete(`${API_BASE}/organizations/missing/members/ada`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).delete(`${API_BASE}/organizations/core/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });

    const missingMembership = await request(app).delete(`${API_BASE}/organizations/core/members/ada`).expect(404);
    expect(missingMembership.body).toMatchObject({ error: "Membership not found" });
  });
});
