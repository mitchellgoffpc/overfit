import { API_BASE } from "@underfit/types";
import type { ApiKey, ApiKeyWithToken } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createOrganizationMember } from "repositories/organization-members";
import { createOrganization } from "repositories/organizations";
import { createUser } from "repositories/users";

interface RegisterResponse {
  user: { id: string };
  session: { token: string };
}

const registerUser = async (app: ReturnType<typeof createApp>, email: string, handle: string) => {
  const response = await request(app).post(`${API_BASE}/auth/register`).send({ email, handle, password: "password123" }).expect(200);
  return response.body as RegisterResponse;
};
const sessionCookie = (token: string) => `underfit_session=${token}`;

describe("users routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let organizationId: string;
  let userId: string;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    organizationId = (await createOrganization(db, { handle: "core", name: "Core" }))!.id;
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null }))!.id;
    await createOrganizationMember(db, organizationId, userId, "ADMIN");
  });

  it("lists user organizations", async () => {
    const response = await request(app).get(`${API_BASE}/users/ada/memberships`).expect(200);
    expect(response.body).toMatchObject([{ id: organizationId, handle: "core", name: "Core", role: "ADMIN" }]);
  });

  it("rejects unknown users when listing memberships", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing/memberships`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });

  it("checks whether an email exists", async () => {
    const missing = await request(app).get(`${API_BASE}/emails/exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "email: Email is required" });

    const exists = await request(app).get(`${API_BASE}/emails/exists`).query({ email: "ada@example.com" }).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${API_BASE}/emails/exists`).query({ email: "grace@example.com" }).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });

  it("updates the current user profile", async () => {
    const { session } = await registerUser(app, "sam@example.com", "sam");
    const response = await request(app)
      .patch(`${API_BASE}/me`).set("Cookie", sessionCookie(session.token)).send({ name: "Sam Tester", bio: "Building models." }).expect(200);
    expect(response.body).toMatchObject({ name: "Sam Tester", bio: "Building models." });
  });

  it("creates and deletes API keys", async () => {
    const { user, session } = await registerUser(app, "alex@example.com", "alex");
    const created = await request(app).post(`${API_BASE}/me/api-keys`).set("Cookie", sessionCookie(session.token)).send({ label: "CI" }).expect(200);
    const createdBody = created.body as ApiKeyWithToken;
    expect(createdBody).toMatchObject({ userId: user.id, label: "CI" });
    expect(typeof createdBody.token).toBe("string");

    const list = await request(app).get(`${API_BASE}/me/api-keys`).set("Cookie", sessionCookie(session.token)).expect(200);
    const listBody = list.body as ApiKey[];
    expect(listBody.length).toBe(1);
    expect(listBody[0]).toMatchObject({ id: createdBody.id, userId: user.id, label: "CI" });
    expect(listBody[0]).not.toHaveProperty("token");

    await request(app).delete(`${API_BASE}/me/api-keys/${createdBody.id}`).set("Cookie", sessionCookie(session.token)).expect(200);

    const listAfterDelete = await request(app).get(`${API_BASE}/me/api-keys`).set("Cookie", sessionCookie(session.token)).expect(200);
    const listAfterDeleteBody = listAfterDelete.body as ApiKey[];
    expect(listAfterDeleteBody.length).toBe(0);
  });
});
