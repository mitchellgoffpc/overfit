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

describe("scalar routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db);
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "underfit", description: null });
    await upsertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "run-1", status: "running", metadata: null });
  });

  it("inserts a scalar", async () => {
    const payload = { step: 10, values: { accuracy: 0.98, loss: 0.12 }, timestamp: testTimestamp };
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send(payload).expect(200);
    expect(response.body).toMatchObject({ runId: "run-1", step: 10, values: { accuracy: 0.98, loss: 0.12 }, timestamp: testTimestamp });
    expect(typeof (response.body as { id: string }).id).toBe("string");
  });

  it("lists scalars for a run", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ step: 1, values: { loss: 0.5 }, timestamp: testTimestamp });
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ step: 2, values: { loss: 0.4 }, timestamp: testTimestamp });
    const response = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).expect(200);
    expect(response.body as unknown[]).toHaveLength(2);
    expect(response.body).toMatchObject([{ step: 1 }, { step: 2 }]);
  });

  it("supports scalars without a step", async () => {
    const payload = { values: { "sys/cpu": 45.2, "sys/mem": 72.1 }, timestamp: testTimestamp };
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send(payload).expect(200);
    expect(response.body).toMatchObject({ step: null, values: { "sys/cpu": 45.2, "sys/mem": 72.1 } });
  });

  it("rejects missing required fields", async () => {
    const missingTimestamp = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ values: { loss: 0.1 } }).expect(400);
    expect(missingTimestamp.body).toMatchObject({ error: "Scalar fields are required: timestamp" });
  });

  it("rejects invalid run references", async () => {
    const response = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/missing-run/scalars`).send({ values: { loss: 0.12 }, timestamp: testTimestamp }).expect(404);
    expect(response.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects invalid values", async () => {
    const notObject = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ values: "bad", timestamp: testTimestamp }).expect(400);
    expect(notObject.body).toMatchObject({ error: "Scalar values must be an object mapping names to numbers" });

    const nonNumeric = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/scalars`).send({ values: { loss: "bad" }, timestamp: testTimestamp }).expect(400);
    expect(nonNumeric.body).toMatchObject({ error: "Scalar values must be an object mapping names to numbers" });
  });
});
