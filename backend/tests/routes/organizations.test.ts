import { API_BASE, SESSION_TOKEN_REQUIRED_ERROR } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createApiKey } from "repositories/api-keys";
import { createOrganizationMember } from "repositories/organization-members";
import { createOrganization } from "repositories/organizations";
import { createUser } from "repositories/users";

describe("organizations routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let organizationId: string;
  let ownerToken: string;
  let ownerId: string;
  let adaToken: string;
  let adaId: string;
  let outsiderToken: string;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    ownerId = (await createUser(db, { email: "owner@example.com", handle: "owner", name: "Owner", bio: null }))!.id;
    adaId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada", bio: null }))!.id;
    const outsiderId = (await createUser(db, { email: "outsider@example.com", handle: "outsider", name: "Outsider", bio: null }))!.id;
    ownerToken = (await createApiKey(db, { userId: ownerId, label: "owner", token: "owner-token" })).token;
    adaToken = (await createApiKey(db, { userId: adaId, label: "ada", token: "ada-token" })).token;
    outsiderToken = (await createApiKey(db, { userId: outsiderId, label: "outsider", token: "outsider-token" })).token;

    organizationId = (await createOrganization(db, { handle: "core", name: "Core" }))!.id;
    await createOrganizationMember(db, organizationId, ownerId, "ADMIN");
  });

  it("requires auth to create organizations", async () => {
    const response = await request(app).post(`${API_BASE}/organizations`).send({ handle: "core2", name: "Core2" }).expect(401);
    expect(response.body).toMatchObject({ error: SESSION_TOKEN_REQUIRED_ERROR });
  });

  it("creates an organization and makes creator an admin", async () => {
    const response = await request(app)
      .post(`${API_BASE}/organizations`).set("Authorization", `Bearer ${ownerToken}`).send({ handle: "core2", name: "Core2" }).expect(201);
    expect(response.body).toMatchObject({ handle: "core2", name: "Core2" });

    const members = await request(app).get(`${API_BASE}/organizations/core2/members`).expect(200);
    expect(members.body).toMatchObject([{ id: ownerId, handle: "owner", role: "ADMIN" }]);
  });

  it("updates organizations for admins and preserves ids", async () => {
    const updated = await request(app)
      .patch(`${API_BASE}/organizations/core`).set("Authorization", `Bearer ${ownerToken}`).send({ name: "Core Team" }).expect(200);
    expect(updated.body).toMatchObject({ id: organizationId, handle: "core", name: "Core Team" });
  });

  it("rejects organization updates from non-admins", async () => {
    const response = await request(app)
      .patch(`${API_BASE}/organizations/core`).set("Authorization", `Bearer ${outsiderToken}`).send({ name: "Core Team" }).expect(403);
    expect(response.body).toMatchObject({ error: "Forbidden" });
  });

  it("rejects duplicate organization creates", async () => {
    const response = await request(app)
      .post(`${API_BASE}/organizations`).set("Authorization", `Bearer ${ownerToken}`).send({ handle: "core", name: "Core Team" }).expect(409);
    expect(response.body).toMatchObject({ error: "Organization already exists" });
  });

  it("lists organization members", async () => {
    await request(app).put(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/core/members`).expect(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: adaId, email: "ada@example.com", handle: "ada", role: "MEMBER" }),
      expect.objectContaining({ id: ownerId, email: "owner@example.com", handle: "owner", role: "ADMIN" })
    ]));
  });

  it("creates and deletes memberships for admins", async () => {
    await request(app).put(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${ownerToken}`).send({ role: "ADMIN" }).expect(200);
    await request(app).delete(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/core/members`).expect(200);
    expect(response.body).toMatchObject([{ id: ownerId, handle: "owner", role: "ADMIN" }]);
  });

  it("rejects invalid membership roles", async () => {
    const response = await request(app)
      .put(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${ownerToken}`).send({ role: "OWNER" }).expect(400);
    expect((response.body as { error: string }).error).toContain("role:");
  });

  it("rejects membership changes from non-admins", async () => {
    await request(app).put(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${ownerToken}`).send({ role: "MEMBER" }).expect(200);

    const update = await request(app)
      .put(`${API_BASE}/organizations/core/members/owner`).set("Authorization", `Bearer ${adaToken}`).send({ role: "MEMBER" }).expect(403);
    expect(update.body).toMatchObject({ error: "Forbidden" });

    const remove = await request(app).delete(`${API_BASE}/organizations/core/members/owner`).set("Authorization", `Bearer ${adaToken}`).expect(403);
    expect(remove.body).toMatchObject({ error: "Forbidden" });
  });

  it("allows users to remove themselves", async () => {
    await request(app).put(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${ownerToken}`).send({ role: "MEMBER" }).expect(200);
    await request(app).delete(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${adaToken}`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/core/members`).expect(200);
    expect(response.body).toMatchObject([{ id: ownerId, handle: "owner", role: "ADMIN" }]);
  });

  it("rejects removing or demoting the only admin", async () => {
    const demote = await request(app)
      .put(`${API_BASE}/organizations/core/members/owner`).set("Authorization", `Bearer ${ownerToken}`).send({ role: "MEMBER" }).expect(400);
    expect(demote.body).toMatchObject({ error: "Cannot remove the only admin" });

    const remove = await request(app).delete(`${API_BASE}/organizations/core/members/owner`).set("Authorization", `Bearer ${ownerToken}`).expect(400);
    expect(remove.body).toMatchObject({ error: "Cannot remove the only admin" });
  });

  it("rejects unknown orgs and users when creating memberships", async () => {
    const missingOrg = await request(app).put(`${API_BASE}/organizations/missing/members/ada`).set("Authorization", `Bearer ${ownerToken}`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).put(`${API_BASE}/organizations/core/members/missing`).set("Authorization", `Bearer ${ownerToken}`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });
  });

  it("rejects unknown orgs, users, and memberships when deleting memberships", async () => {
    const missingOrg = await request(app).delete(`${API_BASE}/organizations/missing/members/ada`).set("Authorization", `Bearer ${ownerToken}`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).delete(`${API_BASE}/organizations/core/members/missing`).set("Authorization", `Bearer ${ownerToken}`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });

    const missingMembership = await request(app).delete(`${API_BASE}/organizations/core/members/ada`).set("Authorization", `Bearer ${ownerToken}`).expect(404);
    expect(missingMembership.body).toMatchObject({ error: "Membership not found" });
  });
});
