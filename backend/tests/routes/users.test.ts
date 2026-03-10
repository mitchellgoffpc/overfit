import { setTimeout as delay } from "timers/promises";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertOrganizationMember } from "repositories/organization-members.js";
import { upsertOrganization } from "repositories/organizations";
import { upsertProject } from "repositories/projects";
import { upsertRun } from "repositories/runs";
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

  it("lists runs for a user by created date", async () => {
    await upsertUser(db, { id: "user-2", email: "grace@example.com", handle: "grace", displayName: "Grace Hopper", name: "Grace Hopper", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "underfit", description: null });
    await upsertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "Run 1", status: "running", metadata: null });
    await delay(5);
    await upsertRun(db, { id: "run-2", projectId: "project-1", userId: "user-1", name: "Run 2", status: "finished", metadata: null });
    await upsertRun(db, { id: "run-3", projectId: "project-1", userId: "user-2", name: "Run 3", status: "running", metadata: null });

    const response = await request(app).get(`${API_BASE}/users/user-1/runs`).expect(200);
    const runs = response.body as { id: string }[];
    expect(runs.map((run) => run.id)).toEqual(["run-2", "run-1"]);
  });

  it("rejects unknown users when listing runs", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing/runs`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });
});
