import { setTimeout as delay } from "timers/promises";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import { upsertSession } from "repositories/sessions";
import { createUser } from "repositories/users";

interface RunResponse {
  id: string;
  name: string;
}

describe("runs routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let userId: string;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null })).id;
    await upsertProject(db, { id: "project-1", accountId: userId, name: "underfit", description: null });
    await upsertSession(db, { id: "token-1", userId, expiresAt: "2099-01-01T00:00:00.000Z" });
  });

  it("inserts and fetches a run", async () => {
    const insertResponse = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs`).set("x-session-token", "token-1").send({ status: "running", metadata: { lr: 0.001 } }).expect(200);
    const inserted = insertResponse.body as RunResponse;
    expect(insertResponse.body).toMatchObject({ projectId: "project-1", user: "ada", status: "running", metadata: { lr: 0.001 } });
    expect(typeof inserted.name).toBe("string");
    expect(inserted.name).not.toHaveLength(0);
    expect(inserted.name).toMatch(/^[a-z]+-[a-z]+$/);

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/${inserted.name}`).expect(200);
    expect(response.body).toMatchObject({ id: inserted.id, projectId: "project-1", user: "ada", status: "running", metadata: { lr: 0.001 } });
  });

  it("rejects unknown runs", async () => {
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects unknown projects when inserting", async () => {
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/missing/runs`).set("x-session-token", "token-1").send({ status: "running" }).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("requires auth to insert runs", async () => {
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs`).send({ status: "running" }).expect(401);
    expect(response.body).toMatchObject({ error: "Session token is required" });
  });

  it("updates a run", async () => {
    const run = await insertRun(db, { projectId: "project-1", userId, name: "baseline", status: "running", metadata: null });

    const response = await request(app).put(`${API_BASE}/accounts/ada/projects/underfit/runs/baseline`).send({ status: "finished", metadata: { loss: 0.12 } }).expect(200);
    expect(response.body).toMatchObject({ id: run.id, status: "finished", metadata: { loss: 0.12 } });
  });

  it("partially updates a run", async () => {
    const run = await insertRun(db, { projectId: "project-1", userId, name: "baseline", status: "running", metadata: { loss: 0.13 } });

    const response = await request(app).put(`${API_BASE}/accounts/ada/projects/underfit/runs/baseline`).send({ metadata: { loss: 0.12 } }).expect(200);
    expect(response.body).toMatchObject({ id: run.id, status: "running", metadata: { loss: 0.12 } });
  });

  it("fetches a run", async () => {
    const run = await insertRun(db, { projectId: "project-1", userId, name: "baseline", status: "running", metadata: null });

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/baseline`).expect(200);
    expect(response.body).toMatchObject({ id: run.id, projectId: "project-1", user: "ada", name: "baseline", status: "running" });

    const missing = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/missing`).expect(404);
    expect(missing.body).toMatchObject({ error: "Run not found" });
  });

  it("lists runs for a project", async () => {
    const user2Id = (await createUser(db, { email: "grace@example.com", handle: "grace", name: "Grace Hopper", bio: null })).id;
    const firstRun = await insertRun(db, { projectId: "project-1", userId, name: "a", status: "running", metadata: null });
    await delay(5);
    const secondRun = await insertRun(db, { projectId: "project-1", userId: user2Id, name: "b", status: "finished", metadata: null });
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs`).expect(200);
    const runs = response.body as { id: string }[];
    expect(runs.map((run) => run.id)).toEqual([secondRun.id, firstRun.id]);
  });

  it("rejects unknown projects when listing project runs", async () => {
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/missing/runs`).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("lists runs for a user handle by created date", async () => {
    const user2Id = (await createUser(db, { email: "grace@example.com", handle: "grace", name: "Grace Hopper", bio: null })).id;
    const firstRun = await insertRun(db, { projectId: "project-1", userId, name: "run-1", status: "running", metadata: null });
    await delay(5);
    const secondRun = await insertRun(db, { projectId: "project-1", userId, name: "run-2", status: "finished", metadata: null });
    await insertRun(db, { projectId: "project-1", userId: user2Id, name: "run-3", status: "running", metadata: null });

    const response = await request(app).get(`${API_BASE}/users/ada/runs`).expect(200);
    const runs = response.body as { id: string }[];
    expect(runs.map((run) => run.id)).toEqual([secondRun.id, firstRun.id]);
  });

  it("rejects unknown user handles when listing runs", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing/runs`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });
});
