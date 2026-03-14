import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createProject } from "repositories/projects";
import { createRun } from "repositories/runs";
import { createUser } from "repositories/users";

const testTimestamp = "2025-01-01T00:00:00.000Z";

describe("scalar routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let userId: string;
  let projectId: string;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({}), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null }))!.id;
    projectId = (await createProject(db, { accountId: userId, name: "underfit", description: null }))!.id;
    await createRun(db, { projectId, userId, name: "run-1", status: "running", metadata: null });
  });

  it("buffers scalar batches", async () => {
    const payload = { startLine: 0, scalars: [{ step: 10, values: { accuracy: 0.98, loss: 0.12 }, timestamp: testTimestamp }] };
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send(payload).expect(200);
    expect(response.body).toMatchObject({ status: "buffered" });
  });

  it("lists scalars for a run", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({
      startLine: 0,
      scalars: [{ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp }]
    }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({
      startLine: 1,
      scalars: [{ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }]
    }).expect(200);

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).expect(200);
    expect(response.body).toMatchObject([
      { step: 1, values: { loss: 0.5 }, timestamp: testTimestamp },
      { step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }
    ]);
  });

  it("fetches scalars by account handle, project name, and run name", async () => {
    await createRun(db, { projectId, userId, name: "baseline", status: "running", metadata: null });
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/baseline/scalars`).send({
      startLine: 0,
      scalars: [{ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp }]
    }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/baseline/scalars`).send({
      startLine: 1,
      scalars: [{ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }]
    }).expect(200);

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/baseline/scalars`).expect(200);
    expect(response.body).toMatchObject([{ step: 1 }, { step: 2 }]);

    const missing = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/missing/scalars`).expect(404);
    expect(missing.body).toMatchObject({ error: "Run not found" });
  });

  it("supports scalars without a step", async () => {
    const payload = { startLine: 0, scalars: [{ values: { "sys/cpu": 45.2, "sys/mem": 72.1 }, timestamp: testTimestamp }] };
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send(payload).expect(200);

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).expect(200);
    expect(response.body).toMatchObject([{ step: null, values: { "sys/cpu": 45.2, "sys/mem": 72.1 }, timestamp: testTimestamp }]);
  });

  it("rejects missing required fields", async () => {
    const missingStartLine = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({
      scalars: [{ values: { loss: 0.1 }, timestamp: testTimestamp }]
    }).expect(400);
    expect(missingStartLine.body).toMatchObject({ error: "startLine: Invalid input: expected number, received undefined" });
  });

  it("rejects invalid run references", async () => {
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/missing-run/scalars`).send({
      startLine: 0,
      scalars: [{ values: { loss: 0.12 }, timestamp: testTimestamp }]
    }).expect(404);
    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects invalid values", async () => {
    const notArray = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({
      startLine: 0,
      scalars: { values: { loss: 0.1 }, timestamp: testTimestamp }
    }).expect(400);
    expect(notArray.body).toMatchObject({ error: "scalars: Invalid input: expected array, received object" });

    const nonNumeric = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({
      startLine: 0,
      scalars: [{ values: { loss: "bad" }, timestamp: testTimestamp }]
    }).expect(400);
    expect(nonNumeric.body).toMatchObject({ error: "scalars.0.values.loss: Invalid input: expected number, received string" });
  });

  it("rejects out-of-order startLine", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({
      startLine: 0,
      scalars: [{ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp }]
    }).expect(200);

    const outOfOrder = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({
      startLine: 0,
      scalars: [{ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }]
    }).expect(409);
    expect(outOfOrder.body).toMatchObject({ error: "Invalid startLine", expectedStartLine: 1 });
  });
});
