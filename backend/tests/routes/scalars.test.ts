import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { API_BASE } from "@underfit/types";
import type { Scalar } from "@underfit/types";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

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
  let storageBaseDir: string;
  let userId: string;
  let projectId: string;
  let auth: [string, string];

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-scalars-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({ storage: { type: "file", baseDir: storageBaseDir } }), db);
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

  it("aggregates scalars into coarser resolution tiers", async () => {
    const scalars = Array.from({ length: 20 }, (_, i) => ({
      step: i, values: { loss: 1.0 - i * 0.04 }, timestamp: `2025-01-01T00:00:${String(i).padStart(2, "0")}.000Z`
    }));
    const payload = { startLine: 0, scalars };
    await request(app).post(RUN_SCALARS).set(...auth).send(payload).expect(200);

    const r0 = await request(app).get(RUN_SCALARS).query({ resolution: "0" }).expect(200);
    const r0Scalars = r0.body as Scalar[];
    expect(r0Scalars).toHaveLength(20);
    expect(r0Scalars[0]).toMatchObject({ step: 0, values: { loss: 1.0 } });

    const r1 = await request(app).get(RUN_SCALARS).query({ resolution: "1" }).expect(200);
    const r1Scalars = r1.body as Scalar[];
    expect(r1Scalars).toHaveLength(2);
    expect(r1Scalars[0]!.step).toBe(9);
    const expectedAvg0 = (1.0 + 0.96 + 0.92 + 0.88 + 0.84 + 0.80 + 0.76 + 0.72 + 0.68 + 0.64) / 10;
    expect(r1Scalars[0]!.values["loss"]).toBeCloseTo(expectedAvg0);
    expect(r1Scalars[1]!.step).toBe(19);
  });

  it("selects resolution automatically from maxPoints", async () => {
    const scalars = Array.from({ length: 20 }, (_, i) => ({
      step: i, values: { loss: 1.0 - i * 0.04 }, timestamp: `2025-01-01T00:00:${String(i).padStart(2, "0")}.000Z`
    }));
    await request(app).post(RUN_SCALARS).set(...auth).send({ startLine: 0, scalars }).expect(200);

    const wantAll = await request(app).get(RUN_SCALARS).query({ maxPoints: "20" }).expect(200);
    expect(wantAll.body).toHaveLength(20);

    const wantFewer = await request(app).get(RUN_SCALARS).query({ maxPoints: "2" }).expect(200);
    const fewScalars = wantFewer.body as Scalar[];
    expect(fewScalars).toHaveLength(2);
    expect(fewScalars[0]!.step).toBe(9);
  });

  it("rejects resolution and maxPoints together", async () => {
    const response = await request(app).get(RUN_SCALARS).query({ resolution: "0", maxPoints: "100" }).expect(400);
    expect(response.body).toMatchObject({ error: "resolution and maxPoints are mutually exclusive" });
  });

  it("aggregates correctly across multiple POST requests", async () => {
    const ts = (i: number) => `2025-01-01T00:00:${String(i).padStart(2, "0")}.000Z`;
    const batch1 = Array.from({ length: 7 }, (_, i) => ({ step: i, values: { loss: i * 0.1 }, timestamp: ts(i) }));
    const batch2 = Array.from({ length: 7 }, (_, i) => ({ step: i + 7, values: { loss: (i + 7) * 0.1 }, timestamp: ts(i + 7) }));
    const batch3 = Array.from({ length: 6 }, (_, i) => ({ step: i + 14, values: { loss: (i + 14) * 0.1 }, timestamp: ts(i + 14) }));
    await request(app).post(RUN_SCALARS).set(...auth).send({ startLine: 0, scalars: batch1 }).expect(200);
    await request(app).post(RUN_SCALARS).set(...auth).send({ startLine: 7, scalars: batch2 }).expect(200);
    await request(app).post(RUN_SCALARS).set(...auth).send({ startLine: 14, scalars: batch3 }).expect(200);

    const r1 = await request(app).get(RUN_SCALARS).query({ resolution: "1" }).expect(200);
    const r1Scalars = r1.body as Scalar[];
    expect(r1Scalars).toHaveLength(2);
    const expectedAvg0 = Array.from({ length: 10 }, (_, i) => i * 0.1).reduce((a, b) => a + b) / 10;
    expect(r1Scalars[0]!.values["loss"]).toBeCloseTo(expectedAvg0);
    expect(r1Scalars[0]!.step).toBe(9);
    expect(r1Scalars[1]!.step).toBe(19);
  });

  it("falls back to r0 when maxPoints exceeds all tier counts", async () => {
    const scalars = Array.from({ length: 5 }, (_, i) => ({
      step: i, values: { loss: i * 0.1 }, timestamp: `2025-01-01T00:00:0${String(i)}.000Z`
    }));
    await request(app).post(RUN_SCALARS).set(...auth).send({ startLine: 0, scalars }).expect(200);

    const response = await request(app).get(RUN_SCALARS).query({ maxPoints: "1000" }).expect(200);
    expect(response.body).toHaveLength(5);
    expect(response.body).toMatchObject(scalars.map((s) => ({ step: s.step, values: s.values })));
  });

  it("averages correctly when scalars have varying metric keys", async () => {
    const scalars = Array.from({ length: 10 }, (_, i) => ({
      step: i,
      values: i < 5 ? { loss: 1.0, accuracy: 0.8 } : { loss: 0.5 },
      timestamp: `2025-01-01T00:00:${String(i).padStart(2, "0")}.000Z`
    }));
    await request(app).post(RUN_SCALARS).set(...auth).send({ startLine: 0, scalars }).expect(200);

    const r1 = await request(app).get(RUN_SCALARS).query({ resolution: "1" }).expect(200);
    const r1Scalars = r1.body as Scalar[];
    expect(r1Scalars).toHaveLength(1);
    expect(r1Scalars[0]!.values["loss"]).toBeCloseTo((1.0 * 5 + 0.5 * 5) / 10);
    expect(r1Scalars[0]!.values["accuracy"]).toBeCloseTo(0.8);
  });

  it("flushes partial accumulator buckets", async () => {
    const scalars = Array.from({ length: 5 }, (_, i) => ({
      step: i, values: { loss: 0.5 + i * 0.1 }, timestamp: `2025-01-01T00:00:0${String(i)}.000Z`
    }));
    await request(app).post(RUN_SCALARS).set(...auth).send({ startLine: 0, scalars }).expect(200);
    await request(app).post(`${RUN_SCALARS}/flush`).set(...auth).send({}).expect(200);

    const r1 = await request(app).get(RUN_SCALARS).query({ resolution: "1" }).expect(200);
    const r1Scalars = r1.body as Scalar[];
    expect(r1Scalars).toHaveLength(1);
    const expectedAvg = (0.5 + 0.6 + 0.7 + 0.8 + 0.9) / 5;
    expect(r1Scalars[0]!.values["loss"]).toBeCloseTo(expectedAvg);
    expect(r1Scalars[0]!.step).toBe(4);
  });
});
