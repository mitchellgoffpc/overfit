import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { API_BASE } from "@underfit/types";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "app";
import { AppConfigSchema } from "config";
import { createDatabase } from "db";
import type { Database } from "db";
import { listLogSegmentsForCursor } from "repositories/logs";
import { createProject } from "repositories/projects";
import { createRun } from "repositories/runs";
import { createUser } from "repositories/users";

describe("logs routes", () => {
  let db: Database;
  let app: ReturnType<typeof createApp>;
  let storageBaseDir: string;
  let userId: string;
  let runId: string;
  let projectId: string;

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-logs-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    app = createApp(AppConfigSchema.parse({ storage: { type: "file", baseDir: storageBaseDir } }), db);
    userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null }))!.id;
    projectId = (await createProject(db, { accountId: userId, name: "underfit", description: null }))!.id;
    runId = (await createRun(db, { projectId, userId, name: "run-1", status: "running", metadata: null }))!.id;
  });

  it("reads buffered log deltas with cursor polling", async () => {
    const payloadA = {
      workerId: "worker-1",
      lines: [
        { timestamp: "2025-01-01T00:00:00.000Z", content: "hello" },
        { timestamp: "2025-01-01T00:00:00.500Z", content: "world" }
      ]
    };
    const payloadB = {
      workerId: "worker-1",
      lines: [{ timestamp: "2025-01-01T00:00:10.000Z", content: "next block" }]
    };

    const insertedA = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send(payloadA).expect(200);
    expect(insertedA.body).toMatchObject({ status: "buffered" });

    const insertedB = await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send(payloadB).expect(200);
    expect(insertedB.body).toMatchObject({ status: "buffered" });

    const firstPage = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", count: "2" }).expect(200);
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
      lines: [
        { timestamp: "2025-01-01T00:00:00.000Z", content: "a" },
        { timestamp: "2025-01-01T00:00:01.000Z", content: "b" },
        { timestamp: "2025-01-01T00:00:02.000Z", content: "c" },
        { timestamp: "2025-01-01T00:00:03.000Z", content: "d" }
      ]
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
      hasMore: true
    });
  });

  it("reads persisted segments first and buffered tail on the next cursor", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send({
      workerId: "worker-1",
      lines: [
        { timestamp: "2025-01-01T00:00:00.000Z", content: "line-0" },
        { timestamp: "2025-01-01T00:00:00.100Z", content: "line-1" }
      ]
    }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs/flush`).send({ workerId: "worker-1" }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send({
      workerId: "worker-1",
      lines: [
        { timestamp: "2025-01-01T00:00:01.000Z", content: "line-2" },
        { timestamp: "2025-01-01T00:00:01.100Z", content: "line-3" }
      ]
    }).expect(200);

    const persistedPage = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", cursor: "1", count: "3" }).expect(200);
    expect(persistedPage.body).toMatchObject({
      entries: [{ startLine: 1, endLine: 2, content: "line-1" }],
      nextCursor: 2,
      hasMore: true
    });

    const bufferedPage = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", cursor: "2", count: "3" }).expect(200);
    expect(bufferedPage.body).toMatchObject({
      entries: [{ startLine: 2, endLine: 4, content: "line-2\nline-3" }],
      nextCursor: 4,
      hasMore: false
    });

    const persisted = await listLogSegmentsForCursor(db, runId, "worker-1", 0);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({ startLine: 0, endLine: 2 });
  });

  it("returns full persisted segments even when they pass the count hint", async () => {
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).send({
      workerId: "worker-1",
      lines: [
        { timestamp: "2025-01-01T00:00:00.000Z", content: "a" },
        { timestamp: "2025-01-01T00:00:01.000Z", content: "b" },
        { timestamp: "2025-01-01T00:00:02.000Z", content: "c" },
        { timestamp: "2025-01-01T00:00:03.000Z", content: "d" }
      ]
    }).expect(200);
    await request(app).post(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs/flush`).send({ workerId: "worker-1" }).expect(200);

    const page = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", count: "2" }).expect(200);
    expect(page.body).toMatchObject({
      entries: [{
        startLine: 0,
        endLine: 4,
        content: "a\nb\nc\nd"
      }],
      nextCursor: 4,
      hasMore: true
    });
  });

  it("rejects missing worker and invalid query params", async () => {
    const missingWorker = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).expect(400);
    expect(missingWorker.body).toMatchObject({ error: "workerId: Invalid input: expected string, received undefined" });

    const badCursor = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", cursor: "-1" }).expect(400);
    expect(badCursor.body).toMatchObject({ error: "cursor: Too small: expected number to be >=0" });

    const badCount = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/run-1/logs`).query({ workerId: "worker-1", count: "0" }).expect(400);
    expect(badCount.body).toMatchObject({ error: "count: Too small: expected number to be >0" });
  });

  it("returns run not found for missing runs", async () => {
    const missingInsert = await request(app)
      .post(`${API_BASE}/accounts/ada/projects/underfit/runs/missing/logs`)
      .send({ workerId: "worker-1", lines: [{ timestamp: "2025-01-01T00:00:00.000Z", content: "hello" }] })
      .expect(404);
    expect(missingInsert.body).toMatchObject({ error: "Run not found" });

    const missingList = await request(app).get(`${API_BASE}/accounts/ada/projects/underfit/runs/missing/logs`).query({ workerId: "worker-1" }).expect(404);
    expect(missingList.body).toMatchObject({ error: "Run not found" });
  });

});
