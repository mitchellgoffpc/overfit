import { API_BASE, SLUG_HINT } from "@underfit/types";
import type { Project } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { upsertRun } from "repositories/runs";
import { upsertSession } from "repositories/sessions";
import { upsertUser } from "repositories/users";

describe("projects routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
  });

  it("upserts and fetches a project", async () => {
    await request(app).put(`${API_BASE}/projects/project-1`).send({ accountId: "user-1", name: "Underfit", description: "Tracking runs" }).expect(200);
    const response = await request(app).get(`${API_BASE}/projects/project-1`).expect(200);
    expect(response.body).toMatchObject({ id: "project-1", accountId: "user-1", name: "Underfit", description: "Tracking runs" });
  });

  it("rejects unknown projects", async () => {
    const response = await request(app).get(`${API_BASE}/projects/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("rejects missing required fields", async () => {
    const response = await request(app).put(`${API_BASE}/projects/project-2`).send({ description: "Missing name" }).expect(400);
    expect(response.body).toMatchObject({ error: "Project fields are required: name, accountId" });
  });

  it("rejects invalid project names", async () => {
    const response = await request(app).put(`${API_BASE}/projects/project-2`).send({ accountId: "user-1", name: "Underfit Labs" }).expect(400);
    expect(response.body).toMatchObject({ error: SLUG_HINT });
  });

  it("lists most active projects for the current user", async () => {
    await upsertUser(db, { id: "user-2", email: "grace@example.com", handle: "grace", displayName: "Grace Hopper", name: "Grace Hopper", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "Underfit", description: null });
    await upsertProject(db, { id: "project-2", accountId: "user-1", name: "Telemetry", description: null });
    await upsertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "Run 1", status: "running", metadata: null });
    await upsertRun(db, { id: "run-2", projectId: "project-2", userId: "user-1", name: "Run 2", status: "finished", metadata: null });
    await upsertRun(db, { id: "run-3", projectId: "project-2", userId: "user-1", name: "Run 3", status: "running", metadata: null });
    await upsertRun(db, { id: "run-4", projectId: "project-1", userId: "user-2", name: "Run 4", status: "running", metadata: null });
    await upsertSession(db, { id: "token-1", userId: "user-1", expiresAt: "2099-01-01T00:00:00.000Z" });

    const response = await request(app).get(`${API_BASE}/projects/me`).set("x-session-token", "token-1").expect(200);
    expect((response.body as Project[]).map((project) => project.id)).toEqual(["project-2", "project-1"]);
  });
});
