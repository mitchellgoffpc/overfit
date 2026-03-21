import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { LogBuffer } from "buffers/logs";
import { createDatabase } from "db";
import type { Database } from "db";
import { listLogSegmentsForCursor } from "repositories/logs";
import { createProject } from "repositories/projects";
import { createRun } from "repositories/runs";
import { createUser } from "repositories/users";
import { createStorage } from "storage";

describe("logbuffer", () => {
  let db: Database;
  let storageBaseDir: string;
  let runId: string;

  beforeAll(async () => {
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-logbuffer-"));
  });

  afterAll(async () => {
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    const userId = (await createUser(db, { email: "ada@example.com", handle: "ada", name: "Ada Lovelace", bio: null }))!.id;
    const projectId = (await createProject(db, { accountId: userId, name: "underfit", description: null }))!.id;
    runId = (await createRun(db, { projectId, userId, name: "run-1", status: "running", config: null }))!.id;
  });

  it("buffers lines and flushes explicitly", async () => {
    const storage = createStorage({ type: "file", baseDir: storageBaseDir });
    const logbuffer = new LogBuffer(db, storage, { maxSegmentBytes: 1024 * 1024, maxSegmentAgeMs: 60_000, flushIntervalMs: 10_000 });

    await logbuffer.appendLines(runId, "worker-1", 0, [{ timestamp: "2025-01-01T00:00:00.000Z", content: "hello" }]);
    await logbuffer.appendLines(runId, "worker-1", 1, [{ timestamp: "2025-01-01T00:00:01.000Z", content: "world" }]);
    expect(await listLogSegmentsForCursor(db, runId, "worker-1", 0)).toHaveLength(0);

    await logbuffer.flush(runId, "worker-1");
    const segments = await listLogSegmentsForCursor(db, runId, "worker-1", 0);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ startLine: 0, endLine: 2, byteOffset: 0, byteCount: Buffer.byteLength("hello\nworld\n", "utf8") });

    const file = await fs.readFile(path.join(storageBaseDir, segments[0]!.storageKey), "utf8");
    expect(file).toBe("hello\nworld\n");

    await logbuffer.stop();
  });

  it("flushes when max bytes is reached", async () => {
    const storage = createStorage({ type: "file", baseDir: storageBaseDir });
    const logbuffer = new LogBuffer(db, storage, { maxSegmentBytes: 4, maxSegmentAgeMs: 60_000, flushIntervalMs: 10_000 });

    await logbuffer.appendLines(runId, "worker-1", 0, [{ timestamp: "2025-01-01T00:00:00.000Z", content: "abcd" }]);
    const segments = await listLogSegmentsForCursor(db, runId, "worker-1", 0);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ startLine: 0, endLine: 1, byteOffset: 0, byteCount: 5 });

    await logbuffer.stop();
  });

  it("appends multiple flushes to the same file with correct byte offsets", async () => {
    const storage = createStorage({ type: "file", baseDir: storageBaseDir });
    const logbuffer = new LogBuffer(db, storage, { maxSegmentBytes: 1024 * 1024, maxSegmentAgeMs: 60_000, flushIntervalMs: 10_000 });

    await logbuffer.appendLines(runId, "worker-1", 0, [{ timestamp: "2025-01-01T00:00:00.000Z", content: "first" }]);
    await logbuffer.flush(runId, "worker-1");
    await logbuffer.appendLines(runId, "worker-1", 1, [{ timestamp: "2025-01-01T00:00:01.000Z", content: "second" }]);
    await logbuffer.flush(runId, "worker-1");

    const segments = await listLogSegmentsForCursor(db, runId, "worker-1", 0);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ startLine: 0, endLine: 1, byteOffset: 0 });
    expect(segments[1]).toMatchObject({ startLine: 1, endLine: 2, byteOffset: segments[0]!.byteCount });
    expect(segments[0]!.storageKey).toBe(segments[1]!.storageKey);

    const file = await fs.readFile(path.join(storageBaseDir, segments[0]!.storageKey), "utf8");
    expect(file).toBe("first\nsecond\n");

    const chunk0 = file.slice(segments[0]!.byteOffset, segments[0]!.byteOffset + segments[0]!.byteCount);
    const chunk1 = file.slice(segments[1]!.byteOffset, segments[1]!.byteOffset + segments[1]!.byteCount);
    expect(chunk0).toBe("first\n");
    expect(chunk1).toBe("second\n");

    await logbuffer.stop();
  });

  it("flushes old buffers on interval", async () => {
    const storage = createStorage({ type: "file", baseDir: storageBaseDir });
    const logbuffer = new LogBuffer(db, storage, { maxSegmentBytes: 1024 * 1024, maxSegmentAgeMs: 25, flushIntervalMs: 10 });
    logbuffer.start();

    await logbuffer.appendLines(runId, "worker-1", 0, [{ timestamp: "2025-01-01T00:00:00.000Z", content: "tick" }]);
    expect(await listLogSegmentsForCursor(db, runId, "worker-1", 0)).toHaveLength(0);

    await delay(80);
    expect(await listLogSegmentsForCursor(db, runId, "worker-1", 0)).toHaveLength(1);

    await logbuffer.stop();
  });
});
