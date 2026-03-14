import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import { insertScalar } from "repositories/scalars";
import { createUser } from "repositories/users";

const testTimestamp = "2025-01-01T00:00:00.000Z";

describe("scalar routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let userId: string;
  let runId: string;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null })).id;
    await upsertProject(db, { id: "project-1", accountId: userId, name: "underfit", description: null });
    runId = (await insertRun(db, { projectId: "project-1", userId, name: "run-1", status: "running", metadata: null })).id;
  });

  it("inserts a scalar", async () => {
    const payload = { step: 10, values: { accuracy: 0.98, loss: 0.12 }, timestamp: testTimestamp };
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send(payload).expect(200);
    expect(response.body).toMatchObject({ runId, step: 10, values: { accuracy: 0.98, loss: 0.12 }, timestamp: testTimestamp });
    expect(typeof (response.body as { id: string }).id).toBe("string");
  });

  it("lists scalars for a run", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp });
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp });
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).expect(200);
    expect(response.body as unknown[]).toHaveLength(2);
    expect(response.body).toMatchObject([{ step: 1 }, { step: 2 }]);
  });

  it("fetches scalars by account handle, project name, and run name", async () => {
    const baselineRunId = (await insertRun(db, { projectId: "project-1", userId, name: "baseline", status: "running", metadata: null })).id;
    await insertScalar(db, { runId: baselineRunId, step: 1, values: { loss: 0.5 }, timestamp: testTimestamp });
    await insertScalar(db, { runId: baselineRunId, step: 2, values: { loss: 0.4 }, timestamp: testTimestamp });

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/baseline/scalars`).expect(200);
    expect(response.body as unknown[]).toHaveLength(2);
    expect(response.body).toMatchObject([{ step: 1 }, { step: 2 }]);

    const missing = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/missing/scalars`).expect(404);
    expect(missing.body).toMatchObject({ error: "Run not found" });
  });

  it("supports scalars without a step", async () => {
    const payload = { values: { "sys/cpu": 45.2, "sys/mem": 72.1 }, timestamp: testTimestamp };
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send(payload).expect(200);
    expect(response.body).toMatchObject({ step: null, values: { "sys/cpu": 45.2, "sys/mem": 72.1 } });
  });

  it("rejects missing required fields", async () => {
    const missingTimestamp = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ values: { loss: 0.1 } }).expect(400);
    expect(missingTimestamp.body).toMatchObject({ error: "timestamp: Invalid input: expected string, received undefined" });
  });

  it("rejects invalid run references", async () => {
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/missing-run/scalars`).send({ values: { loss: 0.12 }, timestamp: testTimestamp }).expect(404);
    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects invalid values", async () => {
    const notObject = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ values: "bad", timestamp: testTimestamp }).expect(400);
    expect(notObject.body).toMatchObject({ error: "values: Invalid input: expected record, received string" });

    const nonNumeric = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ values: { loss: "bad" }, timestamp: testTimestamp }).expect(400);
    expect(nonNumeric.body).toMatchObject({ error: "values.loss: Invalid input: expected number, received string" });
  });
});
