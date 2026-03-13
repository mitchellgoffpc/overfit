import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { DEFAULT_CONFIG } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { listLogSegmentsForCursor } from "repositories/logs";
import { upsertProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import { upsertUser } from "repositories/users";

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
    app = createApp({ ...DEFAULT_CONFIG, storage: { type: "file", file: { baseDir: storageBaseDir } } }, db);
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "underfit", description: null });
    await insertRun(db, { id: "run-1", projectId: "project-1", userId: "user-1", name: "run-1", status: "running", metadata: null });
  });

  it("reads buffered log deltas with cursor polling", async () => {
    const payloadA = {
      workerId: "worker-1",
      timestamp: "2025-01-01T00:00:00.000Z",
      content: "hello\nworld\n"
    };
    const payloadB = {
      workerId: "worker-1",
      timestamp: "2025-01-01T00:00:10.000Z",
      content: "next block\n"
    };

    const insertedA = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send(payloadA).expect(200);
    expect(insertedA.body).toMatchObject({ status: "buffered" });

    const insertedB = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send(payloadB).expect(200);
    expect(insertedB.body).toMatchObject({ status: "buffered" });

    const firstPage = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", limit: "2" }).expect(200);
    expect(firstPage.body).toMatchObject({
      entries: [{
        startLine: 0,
        endLine: 2,
        content: "hello\nworld"
      }],
      nextCursor: 2,
      hasMore: true
    });

    const secondPage = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", cursor: "2" }).expect(200);
    expect(secondPage.body).toMatchObject({
      entries: [{
        startLine: 2,
        endLine: 3,
        content: "next block"
      }],
      nextCursor: 3,
      hasMore: false
    });
  });

  it("reads persisted logs and supports cursor in the middle of a segment", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send({
      workerId: "worker-1",
      timestamp: "2025-01-01T00:00:00.000Z",
      content: "a\nb\nc\nd"
    }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs/flush`).send({ workerId: "worker-1" }).expect(200);

    const middle = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", cursor: "2" }).expect(200);
    expect(middle.body).toMatchObject({
      entries: [{
        startLine: 2,
        endLine: 4,
        content: "c\nd"
      }],
      nextCursor: 4,
      hasMore: false
    });
  });

  it("merges persisted segments with buffered tail entries", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send({
      workerId: "worker-1",
      timestamp: "2025-01-01T00:00:00.000Z",
      content: "line-0\nline-1"
    }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs/flush`).send({ workerId: "worker-1" }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send({
      workerId: "worker-1",
      timestamp: "2025-01-01T00:00:01.000Z",
      content: "line-2\nline-3"
    }).expect(200);

    const merged = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", cursor: "1", limit: "3" }).expect(200);
    expect(merged.body).toMatchObject({
      entries: [
        { startLine: 1, endLine: 2, content: "line-1" },
        { startLine: 2, endLine: 4, content: "line-2\nline-3" }
      ],
      nextCursor: 4,
      hasMore: false
    });

    const persisted = await listLogSegmentsForCursor(db, "run-1", "worker-1", { cursor: 0 });
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ startLine: 0, endLine: 2 });
  });

  it("rejects missing worker and invalid query params", async () => {
    const missingWorker = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).expect(400);
    expect(missingWorker.body).toMatchObject({ error: "Log query param workerId is required" });

    const badCursor = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", cursor: "-1" }).expect(400);
    expect(badCursor.body).toMatchObject({ error: "Log query param cursor must be a non-negative integer" });

    const badLimit = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", limit: "0" }).expect(400);
    expect(badLimit.body).toMatchObject({ error: "Log query param limit must be a positive integer" });
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

});
