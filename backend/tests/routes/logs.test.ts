import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { createDatabase } from "db";
import type { Database } from "db";
import { upsertProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import { upsertUser } from "repositories/users";
import { createStorage } from "storage";

describe("logs routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let storageBaseDir: string;

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-logs-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    app = createApp(db, createStorage({ type: "file", file: { baseDir: storageBaseDir } }));
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "underfit", description: null });
    await insertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "run-1", status: "running", metadata: null });
  });

  it("inserts and lists log segments", async () => {
    const payloadA = {
      workerId: "worker-1",
      timestamp: "2025-01-01T00:00:00.000Z",
      content: "hello\nworld"
    };
    const payloadB = {
      workerId: "worker-1",
      timestamp: "2025-01-01T00:00:10.000Z",
      content: "next block"
    };

    const insertedA = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send(payloadA).expect(200);
    expect(insertedA.body).toMatchObject({ status: "buffered" });

    const insertedB = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send(payloadB).expect(200);
    expect(insertedB.body).toMatchObject({ status: "buffered" });

    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs/flush`).send({ workerId: "worker-1" }).expect(200);

    const all = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1" }).expect(200);
    const allSegments = all.body as { segmentIndex: number; lineCount: number; startAt: string; endAt: string }[];
    expect(allSegments).toHaveLength(1);
    expect(allSegments[0]).toMatchObject({ segmentIndex: 0, lineCount: 2, startAt: "2025-01-01T00:00:00.000Z", endAt: "2025-01-01T00:00:10.000Z" });

    const paged = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", start: "0", limit: "1" }).expect(200);
    const pagedSegments = paged.body as { segmentIndex: number }[];
    expect(pagedSegments).toHaveLength(1);
    expect(pagedSegments[0]).toMatchObject({ segmentIndex: 0 });
  });

  it("rejects missing worker and invalid query params", async () => {
    const missingWorker = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).expect(400);
    expect(missingWorker.body).toMatchObject({ error: "Log segment query param workerId is required" });

    const badStart = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", start: "-1" }).expect(400);
    expect(badStart.body).toMatchObject({ error: "Log segment query param start must be a non-negative integer" });

    const badLimit = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", limit: "0" }).expect(400);
    expect(badLimit.body).toMatchObject({ error: "Log segment query param limit must be a positive integer" });
  });

  it("returns run not found for missing runs", async () => {
    const missingInsert = await request(app)
      .post(`${API_BASE}/accounts/ada/projects/underfit/runs/missing/logs`)
      .send({ workerId: "worker-1", timestamp: "2025-01-01T00:00:00.000Z", content: "hello" })
      .expect(404);
    expect(missingInsert.body).toMatchObject({ error: "Run not found" });

    const missingList = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/missing/logs`).query({ workerId: "worker-1" }).expect(404);
    expect(missingList.body).toMatchObject({ error: "Run not found" });
  });

  it("rejects inserts when storage is disabled", async () => {
    const appWithoutStorage = createApp(db);
    const response = await request(appWithoutStorage)
      .post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`)
      .send({ workerId: "worker-1", timestamp: "2025-01-01T00:00:00.000Z", content: "hello" })
      .expect(404);
    expect(response.body).toMatchObject({ error: "Log uploads are disabled" });
  });
});
