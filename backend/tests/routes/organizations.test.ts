import request from "supertest";
import { describe, expect, it } from "vitest";

import { apiBase, assertNotFound, assertRejectCases, createTestApp, get, put } from "@overfit/backend/tests/routes/helpers";

describe("organizations routes", () => {
  it("upserts and fetches an organization", async () => {
    const app = await createTestApp();
    const organizationPayload = { name: "Core", slug: "core" };
    await put(app, "organizations", "org-1", organizationPayload);
    const response = await get(app, "organizations", "org-1");
    expect(response.body).toMatchObject({ id: "org-1", ...organizationPayload });
  });

  it("rejects unknown organizations", async () => {
    const app = await createTestApp();
    await assertNotFound(app, "organizations", "missing", "Organization not found");
  });

  it("rejects missing required fields", async () => {
    const app = await createTestApp();
    const cases = [
      { payload: {}, error: "Organization fields are required: name, slug" },
      { payload: { name: "Core" }, error: "Organization fields are required: slug" },
      { payload: { slug: "core" }, error: "Organization fields are required: name" }
    ];
    await assertRejectCases(app, "organizations", cases);
  });

  it("lists organization members", async () => {
    const app = await createTestApp();
    await put(app, "organizations", "org-1", { name: "Core", slug: "core" });
    await put(app, "users", "user-1", { email: "ada@example.com", username: "Ada Lovelace" });
    await request(app).put(`${apiBase}/organizations/org-1/members/user-1`).expect(200);
    const response = await request(app).get(`${apiBase}/organizations/org-1`).expect(200);
    expect(response.body).toMatchObject({
      id: "org-1",
      name: "Core",
      slug: "core",
      users: [{ id: "user-1", email: "ada@example.com", username: "Ada Lovelace", role: "MEMBER" }]
    });
  });

  it("creates and deletes memberships", async () => {
    const app = await createTestApp();
    await put(app, "organizations", "org-1", { name: "Core", slug: "core" });
    await put(app, "users", "user-1", { email: "ada@example.com", username: "Ada Lovelace" });
    await request(app).put(`${apiBase}/organizations/org-1/members/user-1`).send({ role: "ADMIN" }).expect(200);
    await request(app).delete(`${apiBase}/organizations/org-1/members/user-1`).expect(200);
    const response = await request(app).get(`${apiBase}/organizations/org-1`).expect(200);
    const body = response.body as { users: unknown[] };
    expect(body.users).toEqual([]);
  });

  it("rejects invalid membership roles", async () => {
    const app = await createTestApp();
    await put(app, "organizations", "org-1", { name: "Core", slug: "core" });
    await put(app, "users", "user-1", { email: "ada@example.com", username: "Ada Lovelace" });
    const response = await request(app).put(`${apiBase}/organizations/org-1/members/user-1`).send({ role: "OWNER" }).expect(400);
    expect(response.body).toMatchObject({ error: "Organization role is invalid" });
  });

  it("rejects unknown orgs and users when creating memberships", async () => {
    const app = await createTestApp();
    await put(app, "organizations", "org-1", { name: "Core", slug: "core" });
    await put(app, "users", "user-1", { email: "ada@example.com", username: "Ada Lovelace" });

    const missingOrg = await request(app).put(`${apiBase}/organizations/missing/members/user-1`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).put(`${apiBase}/organizations/org-1/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });
  });

  it("rejects unknown orgs, users, and memberships when deleting memberships", async () => {
    const app = await createTestApp();
    await put(app, "organizations", "org-1", { name: "Core", slug: "core" });
    await put(app, "users", "user-1", { email: "ada@example.com", username: "Ada Lovelace" });

    const missingOrg = await request(app).delete(`${apiBase}/organizations/missing/members/user-1`).expect(404);
    expect(missingOrg.body).toMatchObject({ error: "Organization not found" });

    const missingUser = await request(app).delete(`${apiBase}/organizations/org-1/members/missing`).expect(404);
    expect(missingUser.body).toMatchObject({ error: "User not found" });

    const missingMembership = await request(app).delete(`${apiBase}/organizations/org-1/members/user-1`).expect(404);
    expect(missingMembership.body).toMatchObject({ error: "Membership not found" });
  });
});
