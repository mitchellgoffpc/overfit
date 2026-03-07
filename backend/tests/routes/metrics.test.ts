import { API_BASE } from "@overfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { upsertRun } from "repositories/runs";
import { upsertUser } from "repositories/users";

const testTimestamp = "2025-01-01T00:00:00.000Z";

describe("metrics routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "Overfit", description: null });
    await upsertRun(db, { id: "run-1", projectId: "project-1", name: "Run 1", status: "running", startedAt: null, finishedAt: null, metadata: null });
  });

  it("upserts and fetches a metric", async () => {
    const metricPayload = { runId: "run-1", name: "accuracy", value: 0.98, step: 10, timestamp: testTimestamp };
    await request(app).put(`${API_BASE}/metrics/metric-1`).send(metricPayload).expect(200);
    const response = await request(app).get(`${API_BASE}/metrics/metric-1`).expect(200);
    expect(response.body).toMatchObject({ id: "metric-1", ...metricPayload });
  });

  it("rejects unknown metrics", async () => {
    const response = await request(app).get(`${API_BASE}/metrics/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Metric not found" });
  });

  it("rejects missing required fields", async () => {
    const missingRun = await request(app).put(`${API_BASE}/metrics/reject-0`).send({ value: 0.12, timestamp: testTimestamp }).expect(400);
    expect(missingRun.body).toMatchObject({ error: "Metric fields are required: runId, name" });

    const missingName = await request(app).put(`${API_BASE}/metrics/reject-1`).send({ runId: "run-1", value: 0.12 }).expect(400);
    expect(missingName.body).toMatchObject({ error: "Metric fields are required: name, timestamp" });

    const missingTimestamp = await request(app).put(`${API_BASE}/metrics/reject-2`).send({ runId: "run-1", name: "loss" }).expect(400);
    expect(missingTimestamp.body).toMatchObject({ error: "Metric fields are required: timestamp" });
  });

  it("rejects invalid run references", async () => {
    const response = await request(app).put(`${API_BASE}/metrics/metric-3`).send({ runId: "missing-run", name: "loss", value: 0.12, timestamp: testTimestamp }).expect(400);
    expect(response.body).toMatchObject({ error: "Metric runId does not reference an existing run" });
  });

  it("rejects non-numeric values", async () => {
    const response = await request(app).put(`${API_BASE}/metrics/metric-4`).send({ runId: "run-1", name: "loss", value: "0.12", timestamp: testTimestamp }).expect(400);
    expect(response.body).toMatchObject({ error: "Metric value must be a number" });
  });
});
