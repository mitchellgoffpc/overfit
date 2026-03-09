import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertOrganization } from "repositories/organizations";
import { upsertProject } from "repositories/projects";
import { upsertRun } from "repositories/runs";
import { upsertUser } from "repositories/users";

describe("accounts routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
  });

  it("checks whether a handle exists", async () => {
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "Ada Lovelace", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });

    const missing = await request(app).get(`${API_BASE}/accounts/handle-exists`).expect(400);
    expect(missing.body).toMatchObject({ error: "Handle is required" });

    const exists = await request(app).get(`${API_BASE}/accounts/handle-exists`).query({ handle: "Ada Lovelace" }).expect(200);
    expect(exists.body).toMatchObject({ exists: true });

    const absent = await request(app).get(`${API_BASE}/accounts/handle-exists`).query({ handle: "Grace Hopper" }).expect(200);
    expect(absent.body).toMatchObject({ exists: false });
  });

  it("fetches an account by id", async () => {
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertOrganization(db, { id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });

    const userResponse = await request(app).get(`${API_BASE}/accounts/user-1`).expect(200);
    expect(userResponse.body).toMatchObject({ id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", type: "USER" });

    const orgResponse = await request(app).get(`${API_BASE}/accounts/org-1`).expect(200);
    expect(orgResponse.body).toMatchObject({ id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });

    const missing = await request(app).get(`${API_BASE}/accounts/unknown`).expect(404);
    expect(missing.body).toMatchObject({ error: "Account not found" });
  });

  it("fetches an account by handle", async () => {
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertOrganization(db, { id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });

    const userResponse = await request(app).get(`${API_BASE}/accounts/by-handle/ada`).expect(200);
    expect(userResponse.body).toMatchObject({ id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", type: "USER" });

    const orgResponse = await request(app).get(`${API_BASE}/accounts/by-handle/core`).expect(200);
    expect(orgResponse.body).toMatchObject({ id: "org-1", handle: "core", displayName: "Core", type: "ORGANIZATION" });

    const missing = await request(app).get(`${API_BASE}/accounts/by-handle/unknown`).expect(404);
    expect(missing.body).toMatchObject({ error: "Account not found" });
  });

  it("fetches a project by account handle and name", async () => {
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "Underfit", description: "Tracking runs" });

    const response = await request(app).get(`${API_BASE}/accounts/by-handle/ada/projects/Underfit`).expect(200);
    expect(response.body).toMatchObject({ id: "project-1", accountId: "user-1", name: "Underfit", description: "Tracking runs" });

    const missing = await request(app).get(`${API_BASE}/accounts/by-handle/ada/projects/Missing`).expect(404);
    expect(missing.body).toMatchObject({ error: "Project not found" });
  });

  it("fetches a run by account handle, project name, and run name", async () => {
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "Underfit", description: null });
    await upsertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "baseline", status: "running", metadata: null });

    const response = await request(app).get(`${API_BASE}/accounts/by-handle/ada/projects/Underfit/runs/baseline`).expect(200);
    expect(response.body).toMatchObject({ id: "run-1", projectId: "project-1", userId: "user-1", name: "baseline", status: "running" });

    const missing = await request(app).get(`${API_BASE}/accounts/by-handle/ada/projects/Underfit/runs/missing`).expect(404);
    expect(missing.body).toMatchObject({ error: "Run not found" });
  });
});
