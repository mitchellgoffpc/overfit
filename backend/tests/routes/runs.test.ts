import { API_BASE } from "@overfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";

describe("runs routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertProject(db, { id: "project-1", name: "Overfit", description: null });
  });

  it("upserts and fetches a run", async () => {
    const runPayload = { projectId: "project-1", name: "Run 1", status: "running", metadata: { lr: 0.001 } };
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
    expect(missingProject.body).toMatchObject({ error: "Run fields are required: projectId, name" });

    const missingName = await request(app).put(`${API_BASE}/runs/reject-1`).send({ projectId: "project-1" }).expect(400);
    expect(missingName.body).toMatchObject({ error: "Run fields are required: name, status" });

    const missingStatus = await request(app).put(`${API_BASE}/runs/reject-2`).send({ projectId: "project-1", name: "Run 2" }).expect(400);
    expect(missingStatus.body).toMatchObject({ error: "Run fields are required: status" });
  });
});
