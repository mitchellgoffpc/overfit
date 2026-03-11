import { setTimeout as delay } from "timers/promises";

import { API_BASE, SLUG_HINT } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { upsertRun } from "repositories/runs";
import { upsertUser } from "repositories/users";

describe("runs routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "underfit", description: null });
  });

  it("upserts and fetches a run", async () => {
    const runPayload = { projectId: "project-1", userId: "user-1", name: "run-1", status: "running", metadata: { lr: 0.001 } };
    await request(app).put(`${API_BASE}/runs/run-1`).send(runPayload).expect(200);
    const response = await request(app).get(`${API_BASE}/runs/run-1`).expect(200);
    expect(response.body).toMatchObject({ id: "run-1", ...runPayload });
  });

  it("rejects unknown runs", async () => {
    const response = await request(app).get(`${API_BASE}/runs/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects missing required fields", async () => {
    const missingProject = await request(app).put(`${API_BASE}/runs/reject-0`).send({ status: "running" }).expect(400);
    expect(missingProject.body).toMatchObject({ error: "Run fields are required: projectId, userId, name" });

    const missingName = await request(app).put(`${API_BASE}/runs/reject-1`).send({ projectId: "project-1" }).expect(400);
    expect(missingName.body).toMatchObject({ error: "Run fields are required: userId, name, status" });

    const missingStatus = await request(app).put(`${API_BASE}/runs/reject-2`).send({ projectId: "project-1", name: "run-2" }).expect(400);
    expect(missingStatus.body).toMatchObject({ error: "Run fields are required: userId, status" });
  });

  it("rejects invalid run names", async () => {
    const response = await request(app).put(`${API_BASE}/runs/reject-3`).send({ projectId: "project-1", userId: "user-1", name: "run 3", status: "running" }).expect(400);
    expect(response.body).toMatchObject({ error: SLUG_HINT });
  });

  it("lists runs for a user handle by created date", async () => {
    await upsertUser(db, { id: "user-2", email: "grace@example.com", handle: "grace", displayName: "Grace Hopper", name: "Grace Hopper", bio: null, type: "USER" });
    await upsertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "Run 1", status: "running", metadata: null });
    await delay(5);
    await upsertRun(db, { id: "run-2", projectId: "project-1", userId: "user-1", name: "Run 2", status: "finished", metadata: null });
    await upsertRun(db, { id: "run-3", projectId: "project-1", userId: "user-2", name: "Run 3", status: "running", metadata: null });

    const response = await request(app).get(`${API_BASE}/users/ada/runs`).expect(200);
    const runs = response.body as { id: string }[];
    expect(runs.map((run) => run.id)).toEqual(["run-2", "run-1"]);
  });

  it("rejects unknown user handles when listing runs", async () => {
    const response = await request(app).get(`${API_BASE}/users/missing/runs`).expect(404);
    expect(response.body).toMatchObject({ error: "User not found" });
  });

});
