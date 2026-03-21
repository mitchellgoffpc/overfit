import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createApiKey } from "repositories/api-keys";
import { createOrganizationMember } from "repositories/organization-members";
import { createOrganization } from "repositories/organizations";
import { createProject } from "repositories/projects";
import { createUser } from "repositories/users";

const PROJECT_COLLABORATORS = `${API_BASE}/accounts/owner/projects/my-project/collaborators`;

describe("collaborators routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let ownerToken: string;
  let outsiderToken: string;
  let outsiderId: string;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    const owner = (await createUser(db, { email: "owner@example.com", handle: "owner", name: "Owner", bio: null }))!;
    const outsider = (await createUser(db, { email: "outsider@example.com", handle: "outsider", name: "Outsider", bio: null }))!;
    outsiderId = outsider.id;
    ownerToken = (await createApiKey(db, { userId: owner.id, label: "owner", token: "owner-token" })).token;
    outsiderToken = (await createApiKey(db, { userId: outsider.id, label: "outsider", token: "outsider-token" })).token;

    await createProject(db, { accountId: owner.id, name: "my-project", description: null });
  });

  it("lists collaborators for a project", async () => {
    const response = await request(app).get(PROJECT_COLLABORATORS).expect(200);
    expect(response.body).toEqual([]);
  });

  it("returns 404 for unknown project", async () => {
    const response = await request(app).get(`${API_BASE}/accounts/owner/projects/missing/collaborators`).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("adds a collaborator as the project owner", async () => {
    const response = await request(app).put(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    expect(response.body).toMatchObject({ userId: outsiderId });

    const list = await request(app).get(PROJECT_COLLABORATORS).expect(200);
    expect(list.body).toMatchObject([{ handle: "outsider" }]);
  });

  it("returns 409 when adding a duplicate collaborator", async () => {
    await request(app).put(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const response = await request(app).put(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${ownerToken}`).expect(409);
    expect(response.body).toMatchObject({ error: "User is already a collaborator" });
  });

  it("rejects adding a collaborator by a non-owner", async () => {
    const response = await request(app).put(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${outsiderToken}`).expect(403);
    expect(response.body).toMatchObject({ error: "Forbidden" });
  });

  it("removes a collaborator as the project owner", async () => {
    await request(app).put(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    await request(app).delete(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const list = await request(app).get(PROJECT_COLLABORATORS).expect(200);
    expect(list.body).toEqual([]);
  });

  it("returns 404 when removing a non-existent collaborator", async () => {
    const response = await request(app).delete(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${ownerToken}`).expect(404);
    expect(response.body).toMatchObject({ error: "Collaborator not found" });
  });

  it("rejects removing a collaborator by a non-owner", async () => {
    await request(app).put(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${ownerToken}`).expect(200);
    const response = await request(app).delete(`${PROJECT_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${outsiderToken}`).expect(403);
    expect(response.body).toMatchObject({ error: "Forbidden" });
  });

  it("returns 404 for unknown user when adding collaborator", async () => {
    const response = await request(app).put(`${PROJECT_COLLABORATORS}/ghost`).set("Authorization", `Bearer ${ownerToken}`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });

  describe("organization-owned projects", () => {
    beforeEach(async () => {
      const org = (await createOrganization(db, { handle: "org", name: "Org" }))!;
      const owner = (await createUser(db, { email: "orgadmin@example.com", handle: "orgadmin", name: "OrgAdmin", bio: null }))!;
      await createOrganizationMember(db, org.id, owner.id, "ADMIN");
      const member = (await createUser(db, { email: "orgmember@example.com", handle: "orgmember", name: "OrgMember", bio: null }))!;
      await createOrganizationMember(db, org.id, member.id, "MEMBER");
      await createApiKey(db, { userId: owner.id, label: "orgadmin", token: "orgadmin-token" });
      await createApiKey(db, { userId: member.id, label: "orgmember", token: "orgmember-token" });
      await createProject(db, { accountId: org.id, name: "org-project", description: null });
    });

    const ORG_COLLABORATORS = `${API_BASE}/accounts/org/projects/org-project/collaborators`;

    it("allows org admins to add collaborators", async () => {
      const response = await request(app).put(`${ORG_COLLABORATORS}/outsider`).set("Authorization", "Bearer orgadmin-token").expect(200);
      expect(response.body).toMatchObject({ userId: outsiderId });
    });

    it("rejects org members from adding collaborators", async () => {
      const response = await request(app).put(`${ORG_COLLABORATORS}/outsider`).set("Authorization", "Bearer orgmember-token").expect(403);
      expect(response.body).toMatchObject({ error: "Forbidden" });
    });

    it("allows org admins to remove collaborators", async () => {
      await request(app).put(`${ORG_COLLABORATORS}/outsider`).set("Authorization", "Bearer orgadmin-token").expect(200);
      await request(app).delete(`${ORG_COLLABORATORS}/outsider`).set("Authorization", "Bearer orgadmin-token").expect(200);
      const list = await request(app).get(ORG_COLLABORATORS).expect(200);
      expect(list.body).toEqual([]);
    });

    it("rejects org members from removing collaborators", async () => {
      await request(app).put(`${ORG_COLLABORATORS}/outsider`).set("Authorization", "Bearer orgadmin-token").expect(200);
      const response = await request(app).delete(`${ORG_COLLABORATORS}/outsider`).set("Authorization", "Bearer orgmember-token").expect(403);
      expect(response.body).toMatchObject({ error: "Forbidden" });
    });

    it("rejects non-org-members from adding collaborators", async () => {
      const response = await request(app).put(`${ORG_COLLABORATORS}/outsider`).set("Authorization", `Bearer ${outsiderToken}`).expect(403);
      expect(response.body).toMatchObject({ error: "Forbidden" });
    });
  });
});
