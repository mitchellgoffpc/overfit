import { API_BASE } from "@underfit/types";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { createApiKey } from "repositories/api-keys";
import { createProject } from "repositories/projects";
import { createRun } from "repositories/runs";
import { createUser } from "repositories/users";

const testTimestamp = "2025-01-01T00:00:00.000Z";
const RUN_SCALARS = `${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`;

describe("scalar routes", () => {
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
    await createRun(db, { projectId, userId, name: "run-1", status: "running", config: null });
    const { token } = await createApiKey(db, { userId, label: "test", token: "test-token" });
    auth = ["Authorization", `Bearer ${token}`];
  });

  it("buffers scalar batches", async () => {
    const payload = { startLine: 0, scalars: [{ step: 10, values: { accuracy: 0.98, loss: 0.12 }, timestamp: testTimestamp }] };
    const response = await request(app).post(RUN_SCALARS).set(...auth).send(payload).expect(200);
    expect(response.body).toMatchObject({ status: "buffered" });
  });

  it("lists scalars for a run", async () => {
    const batch1 = { startLine: 0, scalars: [{ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp }] };
    await request(app).post(RUN_SCALARS).set(...auth).send(batch1).expect(200);
    const batch2 = { startLine: 1, scalars: [{ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }] };
    await request(app).post(RUN_SCALARS).set(...auth).send(batch2).expect(200);

    const response = await request(app).get(RUN_SCALARS).expect(200);
    expect(response.body).toMatchObject([
      { step: 1, values: { loss: 0.5 }, timestamp: testTimestamp },
      { step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }
    ]);
  });

  it("fetches scalars by account handle, project name, and run name", async () => {
    await createRun(db, { projectId, userId, name: "baseline", status: "running", config: null });
    const baselineScalars = `${API_BASE}/accounts/ada/projects/underfit/runs/baseline/scalars`;
    const batch1 = { startLine: 0, scalars: [{ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp }] };
    await request(app).post(baselineScalars).set(...auth).send(batch1).expect(200);
    const batch2 = { startLine: 1, scalars: [{ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }] };
    await request(app).post(baselineScalars).set(...auth).send(batch2).expect(200);

    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/baseline/scalars`).expect(200);
    expect(response.body).toMatchObject([{ step: 1 }, { step: 2 }]);

    const missing = await request(app).get(`${API_BASE}/accounts/ada/projects/Underfit/runs/missing/scalars`).expect(404);
    expect(missing.body).toMatchObject({ error: "Run not found" });
  });

  it("supports scalars without a step", async () => {
    const payload = { startLine: 0, scalars: [{ values: { "sys/cpu": 45.2, "sys/mem": 72.1 }, timestamp: testTimestamp }] };
    await request(app).post(RUN_SCALARS).set(...auth).send(payload).expect(200);

    const response = await request(app).get(RUN_SCALARS).expect(200);
    expect(response.body).toMatchObject([{ step: null, values: { "sys/cpu": 45.2, "sys/mem": 72.1 }, timestamp: testTimestamp }]);
  });

  it("rejects missing required fields", async () => {
    const payload = { scalars: [{ values: { loss: 0.1 }, timestamp: testTimestamp }] };
    const response = await request(app).post(RUN_SCALARS).set(...auth).send(payload).expect(400);
    expect(response.body).toMatchObject({ error: "startLine: Invalid input: expected number, received undefined" });
  });

  it("rejects invalid run references", async () => {
    const payload = { startLine: 0, scalars: [{ values: { loss: 0.12 }, timestamp: testTimestamp }] };
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/missing-run/scalars`).set(...auth).send(payload).expect(404);
    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects invalid values", async () => {
    const notArrayPayload = { startLine: 0, scalars: { values: { loss: 0.1 }, timestamp: testTimestamp } };
    const notArray = await request(app).post(RUN_SCALARS).set(...auth).send(notArrayPayload).expect(400);
    expect(notArray.body).toMatchObject({ error: "scalars: Invalid input: expected array, received object" });

    const nonNumericPayload = { startLine: 0, scalars: [{ values: { loss: "bad" }, timestamp: testTimestamp }] };
    const nonNumeric = await request(app).post(RUN_SCALARS).set(...auth).send(nonNumericPayload).expect(400);
    expect(nonNumeric.body).toMatchObject({ error: "scalars.0.values.loss: Invalid input: expected number, received string" });
  });

  it("rejects out-of-order startLine", async () => {
    const first = { startLine: 0, scalars: [{ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp }] };
    await request(app).post(RUN_SCALARS).set(...auth).send(first).expect(200);

    const duplicate = { startLine: 0, scalars: [{ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp }] };
    const outOfOrder = await request(app).post(RUN_SCALARS).set(...auth).send(duplicate).expect(409);
    expect(outOfOrder.body).toMatchObject({ error: "Invalid startLine", expectedStartLine: 1 });
  });
});
