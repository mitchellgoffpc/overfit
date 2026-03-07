import { API_BASE } from "@overfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { upsertRun } from "repositories/runs";

describe("artifacts routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertProject(db, { id: "project-1", name: "Overfit", description: null });
    await upsertRun(db, { id: "run-1", projectId: "project-1", name: "Run 1", status: "running", startedAt: null, finishedAt: null, metadata: null });
  });

  it("upserts and fetches an artifact", async () => {
    const artifactPayload = { runId: "run-1", name: "model", type: "model", version: "v1", uri: "s3://bucket/model" };
    await request(app).put(`${API_BASE}/artifacts/artifact-1`).send(artifactPayload).expect(200);
    const response = await request(app).get(`${API_BASE}/artifacts/artifact-1`).expect(200);
    expect(response.body).toMatchObject({ id: "artifact-1", ...artifactPayload });
  });

  it("rejects unknown artifacts", async () => {
    const response = await request(app).get(`${API_BASE}/artifacts/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Artifact not found" });
  });

  it("rejects missing required fields", async () => {
    const cases = [
      { payload: { name: "model", type: "model" }, error: "Artifact fields are required: runId, version" },
      { payload: { runId: "run-1", type: "model" }, error: "Artifact fields are required: name, version" },
      { payload: { runId: "run-1", name: "model" }, error: "Artifact fields are required: type, version" },
      { payload: { runId: "run-1", name: "model", type: "model" }, error: "Artifact fields are required: version" }
    ];
    for (const { payload, error } of cases) {
      const response = await request(app).put(`${API_BASE}/artifacts/reject`).send(payload).expect(400);
      expect(response.body).toMatchObject({ error });
    }
  });

  it("rejects invalid run references", async () => {
    const payload = { runId: "missing-run", name: "model", type: "model", version: "v1" };
    const response = await request(app).put(`${API_BASE}/artifacts/artifact-3`).send(payload).expect(400);
    expect(response.body).toMatchObject({ error: "Artifact runId does not reference an existing run" });
  });
});
