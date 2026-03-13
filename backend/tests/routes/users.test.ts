import { API_BASE } from "@underfit/types";
import type { ApiKey } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { DEFAULT_CONFIG } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertOrganizationMember } from "repositories/organization-members.js";
import { upsertOrganization } from "repositories/organizations";
import { upsertUser } from "repositories/users";

interface RegisterResponse {
  user: { id: string };
  session: { token: string };
}

const registerUser = async (app: ReturnType<typeof createApp>, email: string, handle: string) => {
  const response = await request(app).post(`${API_BASE}/auth/register`).send({ email, handle, password: "password123" }).expect(200);
  return response.body as RegisterResponse;
};

describe("users routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(DEFAULT_CONFIG, db);
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

  it("updates the current user profile", async () => {
    const { session } = await registerUser(app, "sam@example.com", "sam");
    const response = await request(app).patch(`${API_BASE}/me`).set("Authorization", `Bearer ${session.token}`).send({ name: "Sam Tester", bio: "Building models." }).expect(200);
    expect(response.body).toMatchObject({ name: "Sam Tester", bio: "Building models.", displayName: "Sam Tester" });
  });

  it("creates and deletes API keys", async () => {
    const { user, session } = await registerUser(app, "alex@example.com", "alex");
    const created = await request(app).post(`${API_BASE}/me/api-keys`).set("Authorization", `Bearer ${session.token}`).send({ label: "CI" }).expect(200);
    const createdBody = created.body as ApiKey;
    expect(createdBody).toMatchObject({ userId: user.id, label: "CI" });
    expect(typeof createdBody.token).toBe("string");

    const list = await request(app).get(`${API_BASE}/me/api-keys`).set("Authorization", `Bearer ${session.token}`).expect(200);
    const listBody = list.body as ApiKey[];
    expect(listBody.length).toBe(1);

    await request(app).delete(`${API_BASE}/me/api-keys/${createdBody.id}`).set("Authorization", `Bearer ${session.token}`).expect(200);

    const listAfterDelete = await request(app).get(`${API_BASE}/me/api-keys`).set("Authorization", `Bearer ${session.token}`).expect(200);
    const listAfterDeleteBody = listAfterDelete.body as ApiKey[];
    expect(listAfterDeleteBody.length).toBe(0);
  });
});
