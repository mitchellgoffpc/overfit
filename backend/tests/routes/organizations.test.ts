import request from "supertest";
import { describe, expect, it } from "vitest";

import { API_BASE, assertNotFound, assertRejectCases, createTestApp, createTestDb, createUser, get, put } from "@overfit/backend/tests/routes/helpers";

describe("organizations routes", () => {
  it("upserts and fetches an organization", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    const organizationPayload = { handle: "core", displayName: "Core" };
    await put(app, "organizations", "org-1", organizationPayload);
    const response = await get(app, "organizations", "org-1");
    expect(response.body).toMatchObject({ id: "org-1", ...organizationPayload });
  });

  it("rejects unknown organizations", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await assertNotFound(app, "organizations", "missing", "Organization not found");
  });

  it("rejects missing required fields", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    const cases = [
      { payload: {}, error: "Organization fields are required: handle" },
      { payload: { displayName: "Core" }, error: "Organization fields are required: handle" }
    ];
    await assertRejectCases(app, "organizations", cases);
  });

  it("lists organization members", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });
    await createUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });
    await request(app).put(`${API_BASE}/organizations/org-1/members/user-1`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/org-1/members`).expect(200);
    expect(response.body).toMatchObject([
      { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", role: "MEMBER" }
    ]);
  });

  it("creates and deletes memberships", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });
    await createUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });
    await request(app).put(`${API_BASE}/organizations/org-1/members/user-1`).send({ role: "ADMIN" }).expect(200);
    await request(app).delete(`${API_BASE}/organizations/org-1/members/user-1`).expect(200);
    const response = await request(app).get(`${API_BASE}/organizations/org-1/members`).expect(200);
    expect(response.body).toEqual([]);
  });

  it("rejects invalid membership roles", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });
    await createUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });
    const response = await request(app).put(`${API_BASE}/organizations/org-1/members/user-1`).send({ role: "OWNER" }).expect(400);
    expect(response.body).toMatchObject({ error: "Organization role is invalid" });
  });

  it("rejects unknown orgs and users when creating memberships", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });
    await createUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });

    const missingOrg = await request(app).put(`${API_BASE}/organizations/missing/members/user-1`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).put(`${API_BASE}/organizations/org-1/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });
  });

  it("rejects unknown orgs, users, and memberships when deleting memberships", async () => {
    const db = await createTestDb();
    const app = createTestApp(db);
    await put(app, "organizations", "org-1", { handle: "core", displayName: "Core" });
    await createUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace" });

    const missingOrg = await request(app).delete(`${API_BASE}/organizations/missing/members/user-1`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).delete(`${API_BASE}/organizations/org-1/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });

    const missingMembership = await request(app).delete(`${API_BASE}/organizations/org-1/members/user-1`).expect(404);
    expect(missingMembership.body).toMatchObject({ error: "Membership not found" });
  });
});
