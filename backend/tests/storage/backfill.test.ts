import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase } from "db";
import type { Database } from "db";
import { StorageBackfillService } from "storage/backfill";
import { createStorage } from "storage/index";

const lineBufferConfig = { maxSegmentBytes: 1024 * 1024, maxSegmentAgeMs: 60_000, flushIntervalMs: 10_000 };
const scalarA0 = JSON.stringify({ step: 0, values: { loss: 1 }, timestamp: "2025-01-01T00:00:00.000Z" });
const scalarA1 = JSON.stringify({ step: 1, values: { loss: 0.8 }, timestamp: "2025-01-01T00:00:01.000Z" });
const scalarA2 = JSON.stringify({ step: 2, values: { loss: 0.6 }, timestamp: "2025-01-01T00:00:02.000Z" });

const waitFor = async (check: () => Promise<boolean>, timeoutMs = 3000, stepMs = 20): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await delay(stepMs);
  }
  throw new Error("Timed out waiting for backfill state");
};

describe("storage backfill", () => {
  let db: Database;
  let storageBaseDir: string;
  let service: StorageBackfillService;

  beforeEach(async () => {
    db = await createDatabase({ type: "sqlite", path: ":memory:" });
    storageBaseDir = await fs.mkdtemp(path.join(os.tmpdir(), "underfit-backfill-"));
    const storage = createStorage({ type: "file", baseDir: storageBaseDir });
    service = new StorageBackfillService(db, storage, { enabled: true, scanIntervalMs: 25, debounceMs: 10, realtime: false }, lineBufferConfig);
    service.start();
  });

  afterEach(async () => {
    await service.stop();
    await fs.rm(storageBaseDir, { recursive: true, force: true });
  });

  it("backfills runs, logs, and scalars from local storage into normalized DB rows", async () => {
    const runId = "run-a";
    const runJson = JSON.stringify({ project: "Vision", name: "Trial A", status: "running", config: { lr: 0.01, seed: 7 } });
    const logContent = "hello\nworld\n";
    const scalarContent = [
      JSON.stringify({ step: 1, values: { loss: 0.8 }, timestamp: "2025-01-01T00:00:00.000Z" }),
      JSON.stringify({ step: 2, values: { loss: 0.6 }, timestamp: "2025-01-01T00:00:01.000Z" }),
      ""
    ].join("\n");

    await fs.mkdir(path.join(storageBaseDir, runId, "logs"), { recursive: true });
    await fs.mkdir(path.join(storageBaseDir, runId, "scalars"), { recursive: true });
    await fs.writeFile(path.join(storageBaseDir, runId, "run.json"), runJson);
    await fs.writeFile(path.join(storageBaseDir, runId, "logs", "worker-1.log"), logContent);
    await fs.writeFile(path.join(storageBaseDir, runId, "scalars", "r0.jsonl"), scalarContent);

    await waitFor(async () => {
      const runs = await db.selectFrom("runs").select(["id"]).execute();
      const logs = await db.selectFrom("log_segments").select(["id"]).execute();
      const scalars = await db.selectFrom("scalar_segments").select(["id"]).execute();
      return runs.length === 1 && logs.length === 1 && scalars.length === 1;
    });

    const accounts = await db.selectFrom("accounts").selectAll().orderBy("id", "asc").execute();
    const users = await db.selectFrom("users").selectAll().orderBy("id", "asc").execute();
    const projects = await db.selectFrom("projects").selectAll().orderBy("id", "asc").execute();
    const runs = await db.selectFrom("runs").selectAll().orderBy("id", "asc").execute();
    const logSegments = await db.selectFrom("log_segments").selectAll().orderBy("startLine", "asc").execute();
    const scalarSegments = await db.selectFrom("scalar_segments").selectAll().orderBy("startLine", "asc").execute();

    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ handle: "local", type: "USER" });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: "local@underfit.local", name: "Local" });
    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ name: "vision", description: "Auto-created for local backfill." });
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      id: runId, name: "trial a", status: "running", config: JSON.stringify({ lr: 0.01, seed: 7 })
    });
    expect(logSegments).toHaveLength(1);
    expect(logSegments[0]).toMatchObject({
      runId,
      workerId: "worker-1",
      startLine: 0,
      endLine: 2,
      byteOffset: 0,
      byteCount: Buffer.byteLength(logContent, "utf8"),
      storageKey: `${runId}/logs/worker-1.log`
    });
    expect(scalarSegments).toHaveLength(1);
    expect(scalarSegments[0]).toMatchObject({
      runId,
      resolution: 0,
      startLine: 0,
      endLine: 2,
      startAt: "2025-01-01T00:00:00.000Z",
      endAt: "2025-01-01T00:00:01.000Z",
      byteOffset: 0,
      byteCount: Buffer.byteLength(scalarContent, "utf8"),
      storageKey: `${runId}/scalars/r0.jsonl`
    });
  });

  it("appends new filesystem content into existing segments without duplicating rows", async () => {
    const runId = "run-b";
    await fs.mkdir(path.join(storageBaseDir, runId, "logs"), { recursive: true });
    await fs.mkdir(path.join(storageBaseDir, runId, "scalars"), { recursive: true });
    await fs.writeFile(path.join(storageBaseDir, runId, "run.json"), JSON.stringify({ project: "Vision", name: "Trial B", status: "running", config: {} }));
    await fs.writeFile(path.join(storageBaseDir, runId, "logs", "worker-1.log"), "l0\nl1\n");
    await fs.writeFile(path.join(storageBaseDir, runId, "scalars", "r0.jsonl"), `${scalarA0}\n${scalarA1}\n`);

    await waitFor(async () => {
      const logs = await db.selectFrom("log_segments").select(["id"]).execute();
      const scalars = await db.selectFrom("scalar_segments").select(["id"]).execute();
      return logs.length === 1 && scalars.length === 1;
    });

    const appendedLog = "l0\nl1\nl2\n";
    const appendedScalars = `${scalarA0}\n${scalarA1}\n${scalarA2}\n`;
    await fs.writeFile(path.join(storageBaseDir, runId, "logs", "worker-1.log"), appendedLog);
    await fs.writeFile(path.join(storageBaseDir, runId, "scalars", "r0.jsonl"), appendedScalars);

    await waitFor(async () => {
      const logSegment = await db.selectFrom("log_segments")
        .select(["endLine", "byteCount"])
        .where("runId", "=", runId)
        .executeTakeFirst();
      const scalarSegment = await db.selectFrom("scalar_segments")
        .select(["endLine", "byteCount"])
        .where("runId", "=", runId)
        .where("resolution", "=", 0)
        .executeTakeFirst();
      return !!logSegment && !!scalarSegment && logSegment.endLine === 3 && scalarSegment.endLine === 3 &&
      logSegment.byteCount === Buffer.byteLength(appendedLog, "utf8") &&
        scalarSegment.byteCount === Buffer.byteLength(appendedScalars, "utf8");
    });

    const logSegments = await db.selectFrom("log_segments").selectAll().where("runId", "=", runId).execute();
    const scalarSegments = await db.selectFrom("scalar_segments").selectAll().where("runId", "=", runId).where("resolution", "=", 0).execute();
    expect(logSegments).toHaveLength(1);
    expect(logSegments[0]).toMatchObject({
      startLine: 0, endLine: 3, byteOffset: 0, byteCount: Buffer.byteLength(appendedLog, "utf8")
    });
    expect(scalarSegments).toHaveLength(1);
    expect(scalarSegments[0]).toMatchObject({
      startLine: 0, endLine: 3, byteOffset: 0, byteCount: Buffer.byteLength(appendedScalars, "utf8"), endAt: "2025-01-01T00:00:02.000Z"
    });
  });

  it("rebuilds segments from byte zero when source files are truncated", async () => {
    const runId = "run-c";
    await fs.mkdir(path.join(storageBaseDir, runId, "logs"), { recursive: true });
    await fs.mkdir(path.join(storageBaseDir, runId, "scalars"), { recursive: true });
    await fs.writeFile(path.join(storageBaseDir, runId, "run.json"), JSON.stringify({ project: "Vision", name: "Trial C", status: "running", config: {} }));
    await fs.writeFile(path.join(storageBaseDir, runId, "logs", "worker-1.log"), "a\nb\nc\n");
    const scalarB0 = JSON.stringify({ values: { loss: 1 }, timestamp: "2025-01-01T00:00:00.000Z" });
    const scalarB1 = JSON.stringify({ values: { loss: 0.9 }, timestamp: "2025-01-01T00:00:01.000Z" });
    const scalarB2 = JSON.stringify({ values: { loss: 0.8 }, timestamp: "2025-01-01T00:00:02.000Z" });
    await fs.writeFile(path.join(storageBaseDir, runId, "scalars", "r0.jsonl"), `${scalarB0}\n${scalarB1}\n${scalarB2}\n`);

    await waitFor(async () => {
      const seg = await db.selectFrom("log_segments").select(["endLine"]).where("runId", "=", runId).executeTakeFirst();
      return !!seg && seg.endLine === 3;
    });

    const truncatedLog = "x\n";
    const truncatedScalars = `${JSON.stringify({ values: { loss: 0.5 }, timestamp: "2025-01-02T00:00:00.000Z" })}\n`;
    await fs.writeFile(path.join(storageBaseDir, runId, "logs", "worker-1.log"), truncatedLog);
    await fs.writeFile(path.join(storageBaseDir, runId, "scalars", "r0.jsonl"), truncatedScalars);

    await waitFor(async () => {
      const log = await db.selectFrom("log_segments").selectAll().where("runId", "=", runId).execute();
      const scalar = await db.selectFrom("scalar_segments")
        .selectAll()
        .where("runId", "=", runId)
        .where("resolution", "=", 0)
        .execute();
      return log.length === 1 && scalar.length === 1 &&
        log[0]!.startLine === 0 && log[0]!.endLine === 1 && log[0]!.byteOffset === 0 &&
        log[0]!.byteCount === Buffer.byteLength(truncatedLog, "utf8") &&
        scalar[0]!.startLine === 0 && scalar[0]!.endLine === 1 && scalar[0]!.byteOffset === 0 &&
        scalar[0]!.byteCount === Buffer.byteLength(truncatedScalars, "utf8");
    });
  });

  it("ignores data files without valid run metadata and only ingests valid scalar json lines", async () => {
    const invalidRunId = "run-missing-metadata";
    const orphanScalar = JSON.stringify({ values: { loss: 1 }, timestamp: "2025-01-01T00:00:00.000Z" });
    await fs.mkdir(path.join(storageBaseDir, invalidRunId, "logs"), { recursive: true });
    await fs.mkdir(path.join(storageBaseDir, invalidRunId, "scalars"), { recursive: true });
    await fs.writeFile(path.join(storageBaseDir, invalidRunId, "logs", "worker-1.log"), "orphaned\n");
    await fs.writeFile(path.join(storageBaseDir, invalidRunId, "scalars", "r0.jsonl"), `${orphanScalar}\n`);

    const runId = "run-d";
    await fs.mkdir(path.join(storageBaseDir, runId, "scalars"), { recursive: true });
    await fs.writeFile(path.join(storageBaseDir, runId, "run.json"), JSON.stringify({ project: "Vision", name: "Trial D", status: "finished", config: {} }));
    const scalarLines = [
      JSON.stringify({ step: 0, values: { loss: 1 }, timestamp: "2025-01-01T00:00:00.000Z" }),
      JSON.stringify({ step: 1, values: { loss: 0.9 }, timestamp: "2025-01-01T00:00:01.000Z" }),
      "{bad-json}",
      JSON.stringify({ step: 2, values: { loss: 0.8 }, timestamp: "2025-01-01T00:00:02.000Z" }),
      ""
    ].join("\n");
    await fs.writeFile(path.join(storageBaseDir, runId, "scalars", "r0.jsonl"), scalarLines);

    await waitFor(async () => (await db.selectFrom("runs").selectAll().where("id", "=", runId).execute()).length === 1);
    await delay(100);

    const runs = await db.selectFrom("runs").select(["id"]).orderBy("id", "asc").execute();
    const logSegments = await db.selectFrom("log_segments").select(["runId"]).orderBy("runId", "asc").execute();
    const scalarSegments = await db.selectFrom("scalar_segments").selectAll().orderBy("runId", "asc").execute();

    expect(runs.map((row) => row.id)).toEqual([runId]);
    expect(logSegments).toEqual([]);
    expect(scalarSegments).toHaveLength(1);
    expect(scalarSegments[0]).toMatchObject({
      runId, resolution: 0, startLine: 0, endLine: 2, endAt: "2025-01-01T00:00:01.000Z"
    });
  });
});
