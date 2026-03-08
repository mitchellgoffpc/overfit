import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertOrganization } from "repositories/organizations";
import { upsertUser } from "repositories/users";

describe("organizations routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertOrganization(db, { id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
  });

  it("upserts and fetches an organization", async () => {
    await request(app).put(`${API_BASE}/organizations/org-2`).send({ handle: "core2", displayName: "Core2" }).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/org-2`).expect(200);
    expect(response.body).toMatchObject({ id: "org-2", handle: "core2", displayName: "Core2" });
  });

  it("rejects unknown organizations", async () => {
    const response = await request(app).get(`${API_BASE}/organizations/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Organization not found" });
  });

  it("rejects missing required fields", async () => {
    const missingPayload = await request(app).put(`${API_BASE}/organizations/reject`).expect(400);
    expect(missingPayload.body).toMatchObject({ error: "Organization fields are required: handle" });

    const missingHandle = await request(app).put(`${API_BASE}/organizations/reject`).send({ displayName: "Core" }).expect(400);
    expect(missingHandle.body).toMatchObject({ error: "Organization fields are required: handle" });
  });

  it("lists organization members", async () => {
    await request(app).put(`${API_BASE}/organizations/org-1/members/user-1`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/org-1/members`).expect(200);
    expect(response.body).toMatchObject([
      { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", role: "MEMBER" }
    ]);
  });

  it("creates and deletes memberships", async () => {
    await request(app).put(`${API_BASE}/organizations/org-1/members/user-1`).send({ role: "ADMIN" }).expect(200);
    await request(app).delete(`${API_BASE}/organizations/org-1/members/user-1`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/org-1/members`).expect(200);
    expect(response.body).toEqual([]);
  });

  it("rejects invalid membership roles", async () => {
    const response = await request(app).put(`${API_BASE}/organizations/org-1/members/user-1`).send({ role: "OWNER" }).expect(400);
    expect(response.body).toMatchObject({ error: "Organization role is invalid" });
  });

  it("rejects unknown orgs and users when creating memberships", async () => {
    const missingOrg = await request(app).put(`${API_BASE}/organizations/missing/members/user-1`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).put(`${API_BASE}/organizations/org-1/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });
  });

  it("rejects unknown orgs, users, and memberships when deleting memberships", async () => {
    const missingOrg = await request(app).delete(`${API_BASE}/organizations/missing/members/user-1`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).delete(`${API_BASE}/organizations/org-1/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });

    const missingMembership = await request(app).delete(`${API_BASE}/organizations/org-1/members/user-1`).expect(404);
    expect(missingMembership.body).toMatchObject({ error: "Membership not found" });
  });
});
