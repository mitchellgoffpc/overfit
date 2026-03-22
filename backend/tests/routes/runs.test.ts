import { setTimeout as delay } from "timers/promises";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { MAX_JSON_BYTES } from "helpers";
import { createApiKey } from "repositories/api-keys";
import { createProject } from "repositories/projects";
import { createRun } from "repositories/runs";
import { createUser } from "repositories/users";

const PROJECT_RUNS = `${API_BASE}/accounts/ada/projects/underfit/runs`;

interface RunResponse {
  id: string;
  name: string;
}

describe("runs routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let userId: string;
  let projectId: string;
  let auth: [string, string];

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null }))!.id;
    projectId = (await createProject(db, { accountId: userId, name: "underfit", description: null }))!.id;
    const { token } = await createApiKey(db, { userId, label: "test", token: "test-token" });
    auth = ["Authorization", `Bearer ${token}`];
  });

  it("inserts and fetches a run", async () => {
    const insertResponse = await request(app).post(PROJECT_RUNS).set(...auth).send({ status: "running", config: { lr: 0.001 } }).expect(200);
    const inserted = insertResponse.body as RunResponse;
    expect(insertResponse.body).toMatchObject({ projectId, user: "ada", status: "running", config: { lr: 0.001 } });
    expect(typeof inserted.name).toBe("string");
    expect(inserted.name).not.toHaveLength(0);
    expect(inserted.name).toMatch(/^[a-z]+-[a-z]+$/);

    const response = await request(app).get(`${PROJECT_RUNS}/${inserted.name}`).expect(200);
    expect(response.body).toMatchObject({ id: inserted.id, projectId, user: "ada", status: "running", config: { lr: 0.001 } });
  });

  it("rejects unknown runs", async () => {
    const response = await request(app).get(`${PROJECT_RUNS}/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects unknown projects when inserting", async () => {
    const missing = `${API_BASE}/accounts/ada/projects/missing/runs`;
    const response = await request(app).post(missing).set(...auth).send({ status: "running" }).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("requires auth to insert runs", async () => {
    const response = await request(app).post(PROJECT_RUNS).send({ status: "running" }).expect(401);
    expect(response.body).toMatchObject({ error: "Session token is required" });
  });

  it("updates a run", async () => {
    const run = (await createRun(db, { projectId, userId, name: "baseline", status: "running", config: null }))!;

    const response = await request(app).put(`${PROJECT_RUNS}/baseline`).set(...auth).send({ status: "finished", config: { loss: 0.12 } }).expect(200);
    expect(response.body).toMatchObject({ id: run.id, status: "finished", config: { loss: 0.12 } });
  });

  it("partially updates a run", async () => {
    const run = (await createRun(db, { projectId, userId, name: "baseline", status: "running", config: { loss: 0.13 } }))!;

    const response = await request(app).put(`${PROJECT_RUNS}/baseline`).set(...auth).send({ config: { loss: 0.12 } }).expect(200);
    expect(response.body).toMatchObject({ id: run.id, status: "running", config: { loss: 0.12 } });
  });

  it("fetches a run", async () => {
    const run = (await createRun(db, { projectId, userId, name: "baseline", status: "running", config: null }))!;

    const response = await request(app).get(`${PROJECT_RUNS}/baseline`).expect(200);
    expect(response.body).toMatchObject({ id: run.id, projectId, user: "ada", name: "baseline", status: "running" });

    const missing = await request(app).get(`${PROJECT_RUNS}/missing`).expect(404);
    expect(missing.body).toMatchObject({ error: "Run not found" });
  });

  it("lists runs for a project", async () => {
    const user2Id = (await createUser(db, { email: "grace@example.com", handle: "grace", name: "Grace Hopper", bio: null }))!.id;
    const firstRun = (await createRun(db, { projectId, userId, name: "a", status: "running", config: null }))!;
    await delay(5);
    const secondRun = (await createRun(db, { projectId, userId: user2Id, name: "b", status: "finished", config: null }))!;
    const response = await request(app).get(PROJECT_RUNS).expect(200);
    expect(response.body).toMatchObject([{ id: secondRun.id }, { id: firstRun.id }]);
  });

  it("rejects unknown projects when listing project runs", async () => {
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/missing/runs`).expect(404);
    expect(response.body).toMatchObject({ error: "Project not found" });
  });

  it("lists runs for a user handle by created date", async () => {
    const user2Id = (await createUser(db, { email: "grace@example.com", handle: "grace", name: "Grace Hopper", bio: null }))!.id;
    const firstRun = (await createRun(db, { projectId, userId, name: "run-1", status: "running", config: null }))!;
    await delay(5);
    const secondRun = (await createRun(db, { projectId, userId, name: "run-2", status: "finished", config: null }))!;
    await createRun(db, { projectId, userId: user2Id, name: "run-3", status: "running", config: null });

    const response = await request(app).get(`${API_BASE}/users/ada/runs`).expect(200);
    expect(response.body).toMatchObject([{ id: secondRun.id }, { id: firstRun.id }]);
  });

  it("rejects unknown user handles when listing runs", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing/runs`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });

  it("rejects run creation when config exceeds max size", async () => {
    const response = await request(app).post(PROJECT_RUNS).set(...auth).send({ status: "running", config: { key: "x".repeat(MAX_JSON_BYTES) } }).expect(400);
    expect(response.body).toMatchObject({ error: `config: Serialized JSON exceeds ${String(MAX_JSON_BYTES)} bytes` });
  });

  it("rejects run update when config exceeds max size", async () => {
    await createRun(db, { projectId, userId, name: "baseline", status: "running", config: null });
    const response = await request(app).put(`${PROJECT_RUNS}/baseline`).set(...auth).send({ config: { key: "x".repeat(MAX_JSON_BYTES) } }).expect(400);
    expect(response.body).toMatchObject({ error: `config: Serialized JSON exceeds ${String(MAX_JSON_BYTES)} bytes` });
  });
});
