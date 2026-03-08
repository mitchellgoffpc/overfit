import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { upsertRun } from "repositories/runs";
import { upsertUser } from "repositories/users";

const testTimestamp = "2025-01-01T00:00:00.000Z";

describe("datapoint routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "Underfit", description: null });
    await upsertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "Run 1", status: "running", metadata: null });
  });

  it("upserts and fetches a datapoint", async () => {
    const payload = { runId: "run-1", step: 10, scalars: { accuracy: 0.98, loss: 0.12 }, timestamp: testTimestamp };
    await request(app).put(`${API_BASE}/datapoints/dp-1`).send(payload).expect(200);
    const response = await request(app).get(`${API_BASE}/datapoints/dp-1`).expect(200);
    expect(response.body).toMatchObject({ id: "dp-1", ...payload });
  });

  it("lists datapoints for a run", async () => {
    await request(app).put(`${API_BASE}/datapoints/dp-1`).send({ runId: "run-1", step: 1, scalars: { loss: 0.5 }, timestamp: testTimestamp });
    await request(app).put(`${API_BASE}/datapoints/dp-2`).send({ runId: "run-1", step: 2, scalars: { loss: 0.4 }, timestamp: testTimestamp });
    const response = await request(app).get(`${API_BASE}/runs/run-1/datapoints`).expect(200);
    expect(response.body as unknown[]).toHaveLength(2);
    expect(response.body).toMatchObject([{ step: 1 }, { step: 2 }]);
  });

  it("supports datapoints without a step", async () => {
    const payload = { runId: "run-1", scalars: { "sys/cpu": 45.2, "sys/mem": 72.1 }, timestamp: testTimestamp };
    await request(app).put(`${API_BASE}/datapoints/dp-1`).send(payload).expect(200);
    const response = await request(app).get(`${API_BASE}/datapoints/dp-1`).expect(200);
    expect(response.body).toMatchObject({ step: null, scalars: { "sys/cpu": 45.2, "sys/mem": 72.1 } });
  });

  it("rejects unknown datapoints", async () => {
    const response = await request(app).get(`${API_BASE}/datapoints/missing`).expect(404);
    expect(response.body).toMatchObject({ error: "Datapoint not found" });
  });

  it("rejects missing required fields", async () => {
    const missingRun = await request(app).put(`${API_BASE}/datapoints/reject-0`).send({ scalars: { loss: 0.1 }, timestamp: testTimestamp }).expect(400);
    expect(missingRun.body).toMatchObject({ error: "Datapoint fields are required: runId" });

    const missingTimestamp = await request(app).put(`${API_BASE}/datapoints/reject-1`).send({ runId: "run-1", scalars: { loss: 0.1 } }).expect(400);
    expect(missingTimestamp.body).toMatchObject({ error: "Datapoint fields are required: timestamp" });
  });

  it("rejects invalid run references", async () => {
    const response = await request(app).put(`${API_BASE}/datapoints/dp-3`).send({ runId: "missing-run", scalars: { loss: 0.12 }, timestamp: testTimestamp }).expect(400);
    expect(response.body).toMatchObject({ error: "Datapoint runId does not reference an existing run" });
  });

  it("rejects invalid scalars", async () => {
    const notObject = await request(app).put(`${API_BASE}/datapoints/dp-4`).send({ runId: "run-1", scalars: "bad", timestamp: testTimestamp }).expect(400);
    expect(notObject.body).toMatchObject({ error: "Datapoint scalars must be an object mapping names to numbers" });

    const nonNumeric = await request(app).put(`${API_BASE}/datapoints/dp-5`).send({ runId: "run-1", scalars: { loss: "bad" }, timestamp: testTimestamp }).expect(400);
    expect(nonNumeric.body).toMatchObject({ error: "Datapoint scalars must be an object mapping names to numbers" });
  });
});
