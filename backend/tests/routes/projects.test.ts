import { API_BASE } from "@underfit/types";
import type { Project } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import { upsertSession } from "repositories/sessions";
import { createUser } from "repositories/users";

describe("projects routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let userId: string;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null })).id;
  });

  it("fetches projects by account handle and project name", async () => {
    const project = await createProject(db, { accountId: userId, name: "underfit", description: "Tracking runs" });
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit`).expect(200);
    expect(response.body).toMatchObject({ id: project.id, owner: "ada", name: "underfit", description: "Tracking runs" });
  });

  it("fetches a project by account handle and name case-insensitively", async () => {
    const project = await createProject(db, { accountId: userId, name: "underfit", description: "Tracking runs" });
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit`).expect(200);
    expect(response.body).toMatchObject({ id: project.id, owner: "ada", name: "underfit", description: "Tracking runs" });
  });

  it("rejects unknown projects", async () => {
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("creates and fetches a project by account handle and name", async () => {
    const createResponse = await request(app).post(`${API_BASE}/accounts/ada/projects`).send({ name: "underfit", description: "Tracking runs" }).expect(200);
    expect(createResponse.body).toMatchObject({ owner: "ada", name: "underfit", description: "Tracking runs" });

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit`).expect(200);
    expect(response.body).toMatchObject({ owner: "ada", name: "underfit", description: "Tracking runs" });
  });

  it("updates a project description", async () => {
    await createProject(db, { accountId: userId, name: "underfit", description: "Initial" });
    const response = await request(app).put(`${API_BASE}/accounts/ada/projects/underfit`).send({ description: "Tracking runs" }).expect(200);
    expect(response.body).toMatchObject({ owner: "ada", name: "underfit", description: "Tracking runs" });
  });

  it("rejects invalid project names", async () => {
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects`).send({ name: "Underfit Labs", description: null }).expect(400);
    expect(response.body).toMatchObject({ error: "Invalid project name" });
  });

  it("rejects creating projects for unknown accounts", async () => {
    const response = await request(app).post(`${API_BASE}/accounts/missing/projects`).send({ name: "underfit", description: null }).expect(404);
    expect(response.body).toMatchObject({ error: "Account not found" });
  });

  it("rejects updating unknown projects", async () => {
    const response = await request(app).put(`${API_BASE}/accounts/ada/projects/missing`).send({ description: "Tracking runs" }).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("rejects creating duplicate projects", async () => {
    await createProject(db, { accountId: userId, name: "underfit", description: null });
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects`).send({ name: "underfit", description: null }).expect(409);
    expect(response.body).toMatchObject({ error: "Project already exists" });
  });

  it("rejects updating non-updatable fields", async () => {
    await createProject(db, { accountId: userId, name: "underfit", description: null });
    const response = await request(app).put(`${API_BASE}/accounts/ada/projects/underfit`).send({ name: "new-name", description: "Tracking runs" }).expect(400);
    expect(response.body).toMatchObject({ error: "Unrecognized key: \"name\"" });
  });

  it("lists most active projects for the current user", async () => {
    const user2Id = (await createUser(db, { email: "grace@example.com", handle: "grace", name: "Grace Hopper", bio: null })).id;
    const project1 = await createProject(db, { accountId: userId, name: "underfit", description: null });
    const project2 = await createProject(db, { accountId: userId, name: "telemetry", description: null });
    await insertRun(db, { projectId: project1.id, userId, name: "Run 1", status: "running", metadata: null });
    await insertRun(db, { projectId: project2.id, userId, name: "Run 2", status: "finished", metadata: null });
    await insertRun(db, { projectId: project2.id, userId, name: "Run 3", status: "running", metadata: null });
    await insertRun(db, { projectId: project1.id, userId: user2Id, name: "Run 4", status: "running", metadata: null });
    await upsertSession(db, { id: "token-1", userId, expiresAt: "2099-01-01T00:00:00.000Z" });

    const response = await request(app).get(`${API_BASE}/me/projects`).set("Cookie", "underfit_session=token-1").expect(200);
    expect((response.body as Project[]).map((project) => project.id)).toEqual([project2.id, project1.id]);
  });

  it("lists projects by account handle", async () => {
    const user2Id = (await createUser(db, { email: "grace@example.com", handle: "grace", name: "Grace Hopper", bio: null })).id;
    const project1 = await createProject(db, { accountId: userId, name: "underfit", description: null });
    await createProject(db, { accountId: user2Id, name: "compiler", description: null });

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects`).expect(200);
    expect(response.body).toMatchObject([{ id: project1.id, owner: "ada", name: "underfit" }]);
  });
});
