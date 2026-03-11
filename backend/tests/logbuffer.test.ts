import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "db";
import type { Database } from "db";
import { LogBuffer } from "logbuffer";
import { listLogSegments } from "repositories/logs";
import { upsertProject } from "repositories/projects";
import { insertRun } from "repositories/runs";
import type { RunRow } from "repositories/runs";
import { upsertUser } from "repositories/users";
import { createStorage } from "storage";

describe("logbuffer", () => {
  let db: Database;
  let storageBaseDir: string;
  const run: Omit<RunRow, "createdAt" | "updatedAt" | "metadata"> & { metadata: null } = {
    id: "run-1",
    projectId: "project-1",
    userId: "user-1",
    name: "run-1",
    status: "running",
    metadata: null
  };

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-logbuffer-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", sqlite: { path: ":memory:" } });
    await upsertUser(db, { id: "user-1", email: "ada@example.com", handle: "ada", displayName: "Ada Lovelace", name: "Ada Lovelace", bio: null, type: "USER" });
    await upsertProject(db, { id: "project-1", accountId: "user-1", name: "underfit", description: null });
    await insertRun(db, run);
  });

  it("buffers chunks and flushes explicitly", async () => {
    const storage = createStorage({ type: "file", file: { baseDir: storageBaseDir } });
    const logbuffer = new LogBuffer(db, storage, { maxSegmentBytes: 1024 * 1024, maxSegmentAgeMs: 60_000, flushIntervalMs: 10_000 });

    await logbuffer.appendChunk({ runId: "run-1", workerId: "worker-1", timestamp: "2025-01-01T00:00:00.000Z", content: "hello\n" });
    await logbuffer.appendChunk({ runId: "run-1", workerId: "worker-1", timestamp: "2025-01-01T00:00:01.000Z", content: "world" });
    expect(await listLogSegments(db, "run-1", "worker-1")).toHaveLength(0);

    await logbuffer.flush("run-1", "worker-1");
    const segments = await listLogSegments(db, "run-1", "worker-1");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ segmentIndex: 0, lineCount: 2, byteCount: Buffer.byteLength("hello\nworld", "utf8") });

    const content = await fs.readFile(segments[0].storageKey, "utf8");
    expect(content).toBe("hello\nworld");

    await logbuffer.stop();
  });

  it("flushes when max bytes is reached", async () => {
    const storage = createStorage({ type: "file", file: { baseDir: storageBaseDir } });
    const logbuffer = new LogBuffer(db, storage, { maxSegmentBytes: 4, maxSegmentAgeMs: 60_000, flushIntervalMs: 10_000 });

    await logbuffer.appendChunk({ runId: "run-1", workerId: "worker-1", timestamp: "2025-01-01T00:00:00.000Z", content: "abcd" });
    const segments = await listLogSegments(db, "run-1", "worker-1");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ segmentIndex: 0, byteCount: 4 });

    await logbuffer.stop();
  });

  it("flushes old buffers on interval", async () => {
    const storage = createStorage({ type: "file", file: { baseDir: storageBaseDir } });
    const logbuffer = new LogBuffer(db, storage, { maxSegmentBytes: 1024 * 1024, maxSegmentAgeMs: 25, flushIntervalMs: 10 });
    logbuffer.start();

    await logbuffer.appendChunk({ runId: "run-1", workerId: "worker-1", timestamp: "2025-01-01T00:00:00.000Z", content: "tick" });
    expect(await listLogSegments(db, "run-1", "worker-1")).toHaveLength(0);

    await delay(80);
    expect(await listLogSegments(db, "run-1", "worker-1")).toHaveLength(1);

    await logbuffer.stop();
  });
});
