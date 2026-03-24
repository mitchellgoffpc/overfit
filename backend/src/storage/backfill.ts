import { runStatus } from "@underfit/types";
import type { Run } from "@underfit/types";
import { z } from "zod";

import type { LineBufferConfig } from "buffers/lines";
import type { Database } from "db";
import { nowIso } from "helpers";
import { createLogSegment, deleteLogSegments, getLatestLogSegment, updateLogSegment } from "repositories/logs";
import { createProject, getProject } from "repositories/projects";
import { createRunWithId, getRunById, updateRunById } from "repositories/runs";
import { createScalarSegment, deleteScalarSegments, getLatestScalarSegment, updateScalarSegment } from "repositories/scalars";
import { createUser, getUserByHandle } from "repositories/users";
import type { StorageBackend } from "storage/index";

const LOG_FILE_PATTERN = /^([^/]+)\/logs\/(.+)\.log$/;
const SCALAR_FILE_PATTERN = /^([^/]+)\/scalars\/r(\d+)\.jsonl$/;
const RUN_FILE_PATTERN = /^([^/]+)\/run\.json$/;
const LOCAL_HANDLE = "local";

export const StorageBackfillConfigSchema = z.strictObject({
  enabled: z.boolean().default(false),
  scanIntervalMs: z.coerce.number().int().positive().default(15_000),
  debounceMs: z.coerce.number().int().nonnegative().default(500),
  realtime: z.boolean().default(true)
}).prefault({});
export type StorageBackfillConfig = z.infer<typeof StorageBackfillConfigSchema>;

const RunMetadataSchema = z.strictObject({
  user: z.string().trim().min(1).exactOptional(),
  project: z.string().trim().min(1),
  name: z.string().trim().min(1).exactOptional(),
  status: z.enum(runStatus).exactOptional().prefault("finished"),
  config: z.record(z.string(), z.unknown()).nullable().exactOptional().prefault({})
}).catchall(z.unknown());
type RunMetadata = z.infer<typeof RunMetadataSchema>;

interface ScanFile {
  storageKey: string;
  size: number;
  lastModified: string;
}

const getChunk = (lines: string[], start: number, maxBytes: number): { end: number; byteCount: number } => {
  let end = start;
  let byteCount = 0;
  while (end < lines.length) {
    const next = byteCount + (end > start ? 1 : 0) + Buffer.byteLength(lines[end]!, "utf8");
    if (end > start && next + 1 > maxBytes) {
      break;
    }
    byteCount = next;
    end++;
    if (byteCount + 1 >= maxBytes) {
      break;
    }
  }
  return { end, byteCount: byteCount + 1 };
};

export class StorageBackfillService {
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private flushIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeStorageEvents: (() => Promise<void>) | null = null;
  private flushInFlight = false;
  private readonly pendingStorageKeys = new Set<string>();

  constructor(
    private readonly db: Database,
    private readonly storage: StorageBackend,
    private readonly config: StorageBackfillConfig,
    private readonly lineBufferConfig: LineBufferConfig,
  ) {}

  start(): void {
    void this.enqueueFullScan();
    this.intervalTimer = setInterval(() => {
      void this.enqueueFullScan();
    }, this.config.scanIntervalMs);
    this.intervalTimer.unref();

    this.flushIntervalTimer = setInterval(() => {
      void this.flushQueue();
    }, this.config.debounceMs);
    this.flushIntervalTimer.unref();

    if (this.config.realtime && this.storage.onEvent) {
      this.unsubscribeStorageEvents = this.storage.onEvent((storageKey) => {
        if (storageKey) {
          this.pendingStorageKeys.add(storageKey);
        }
      });
    }
  }

  async stop(): Promise<void> {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.flushIntervalTimer) {
      clearInterval(this.flushIntervalTimer);
      this.flushIntervalTimer = null;
    }
    if (this.unsubscribeStorageEvents) {
      await this.unsubscribeStorageEvents();
      this.unsubscribeStorageEvents = null;
    }
  }

  private async enqueueFullScan(): Promise<void> {
    const files = await this.storage.listFiles("");
    for (const file of files) {
      this.pendingStorageKeys.add(file.name);
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.flushInFlight) {
      return;
    }

    this.flushInFlight = true;
    try {
      while (this.pendingStorageKeys.size > 0) {
        const keys = [...this.pendingStorageKeys];
        this.pendingStorageKeys.clear();
        for (const storageKey of keys) {
          await this.processStorageKey(storageKey);
        }
      }
    } finally {
      this.flushInFlight = false;
    }
  }

  private async processStorageKey(storageKey: string): Promise<void> {
    const runMatch = RUN_FILE_PATTERN.exec(storageKey);
    if (runMatch) {
      await this.ensureRunFromMetadata(runMatch[1]!);
      return;
    }

    const scalarMatch = SCALAR_FILE_PATTERN.exec(storageKey);
    if (scalarMatch) {
      const runId = scalarMatch[1]!;
      const resolution = Number.parseInt(scalarMatch[2]!, 10);
      if (!await this.ensureRunFromMetadata(runId)) {
        return;
      }
      const file = await this.lookupScanFile(storageKey);
      if (!file) {
        return;
      }
      await this.ingestScalarFile(file, runId, resolution);
      return;
    }

    const logMatch = LOG_FILE_PATTERN.exec(storageKey);
    if (logMatch) {
      const runId = logMatch[1]!;
      const workerId = logMatch[2]!;
      if (!await this.ensureRunFromMetadata(runId)) {
        return;
      }
      const file = await this.lookupScanFile(storageKey);
      if (!file) {
        return;
      }
      await this.ingestLogFile(file, runId, workerId);
    }
  }

  private async lookupScanFile(storageKey: string): Promise<ScanFile | null> {
    const parts = storageKey.split("/");
    const name = parts.pop();
    if (!name) {
      return null;
    }
    const prefix = parts.join("/");
    const entries = await this.storage.list(prefix);
    const entry = entries.find((item) => !item.isDirectory && item.name === name);
    return entry ? { storageKey, size: entry.size, lastModified: entry.lastModified } : null;
  }

  private async loadRunMetadata(runId: string): Promise<RunMetadata | null> {
    try {
      const runJson = await this.storage.read(`${runId}/run.json`);
      const parsedJson = JSON.parse(runJson.toString("utf8")) as unknown;
      return RunMetadataSchema.parse(parsedJson);
    } catch {
      return null;
    }
  }

  private async ensureRunFromMetadata(runId: string): Promise<Run | undefined> {
    const metadata = await this.loadRunMetadata(runId);
    if (!metadata) {
      return undefined;
    }

    const user = await this.resolveUser(metadata.user?.trim().toLowerCase());
    if (!user) {
      return undefined;
    }

    const project = await this.resolveProject(user.id, metadata.project.trim().toLowerCase());
    const name = metadata.name?.trim().toLowerCase() ?? runId;
    const existing = await getRunById(this.db, runId);
    if (!existing) {
      return await createRunWithId(this.db, { id: runId, projectId: project.id, userId: user.id, name, status: metadata.status, config: metadata.config });
    }

    const unchanged = existing.projectId === project.id && existing.user === user.handle &&
      existing.name === name && existing.status === metadata.status && JSON.stringify(existing.config) === JSON.stringify(metadata.config);
    if (unchanged) {
      return existing;
    } else {
      return await updateRunById(this.db, runId, { projectId: project.id, userId: user.id, name, status: metadata.status, config: metadata.config });
    }
  }

  private async ingestLogFile(file: ScanFile, runId: string, workerId: string): Promise<void> {
    let latest = await getLatestLogSegment(this.db, runId, workerId);
    if (latest && file.size < latest.byteOffset + latest.byteCount) {
      await deleteLogSegments(this.db, runId, workerId);
      latest = undefined;
    }
    const latestByte = latest ? latest.byteOffset + latest.byteCount : 0;
    const lines = (await this.storage.read(file.storageKey, latestByte, file.size - latestByte)).toString("utf8").split("\n");
    const timestamp = file.lastModified || nowIso();
    lines.pop(); // TODO: We won't injest the last line, fix this
    let lineIndex = 0;
    let lineCursor = latest?.endLine ?? 0;
    let byteOffset = latestByte;
    while (lineIndex < lines.length) {
      const chunk = getChunk(lines, lineIndex, this.lineBufferConfig.maxSegmentBytes);
      const lineCount = chunk.end - lineIndex;
      if (latest && latest.byteCount + chunk.byteCount <= this.lineBufferConfig.maxSegmentBytes) {
        latest = await updateLogSegment(this.db, latest.id, {
          endLine: latest.endLine + lineCount,
          endAt: timestamp,
          byteCount: latest.byteCount + chunk.byteCount
        }) ?? latest;
      } else {
        latest = await createLogSegment(this.db, {
          runId, workerId, startLine: lineCursor, endLine: lineCursor + lineCount, startAt: timestamp, endAt: timestamp,
          byteOffset, byteCount: chunk.byteCount, storageKey: file.storageKey
        });
      }
      lineCursor += lineCount;
      byteOffset += chunk.byteCount;
      lineIndex = chunk.end;
    }
  }

  private async ingestScalarFile(file: ScanFile, runId: string, resolution: number): Promise<void> {
    let latest = await getLatestScalarSegment(this.db, runId, resolution);
    if (latest && file.size < latest.byteOffset + latest.byteCount) {
      await deleteScalarSegments(this.db, runId, resolution);
      latest = undefined;
    }
    const latestByte = latest ? latest.byteOffset + latest.byteCount : 0;
    const lines = (await this.storage.read(file.storageKey, latestByte, file.size - latestByte)).toString("utf8").split("\n");
    lines.pop(); // TODO: We won't injest the last line, fix this

    const timestamps: string[] = [];
    let validCount = 0;
    for (const line of lines) {
      try {
        const scalar = JSON.parse(line) as { timestamp?: unknown };
        timestamps.push(typeof scalar.timestamp === "string" && scalar.timestamp.length > 0 ? scalar.timestamp : file.lastModified || nowIso());
        validCount++;
      } catch {
        break;
      }
    }

    let lineIndex = 0;
    let lineCursor = latest?.endLine ?? 0;
    let byteOffset = latestByte;
    while (lineIndex < validCount) {
      const chunk = getChunk(lines, lineIndex, this.lineBufferConfig.maxSegmentBytes);
      const endIndex = Math.min(chunk.end, validCount);
      const lineCount = endIndex - lineIndex;
      const endAt = timestamps[endIndex - 1]!;
      if (latest && latest.byteCount + chunk.byteCount <= this.lineBufferConfig.maxSegmentBytes) {
        latest = await updateScalarSegment(this.db, latest.id, {
          endLine: latest.endLine + lineCount,
          endAt,
          byteCount: latest.byteCount + chunk.byteCount
        }) ?? latest;
      } else {
        latest = await createScalarSegment(this.db, {
          runId, resolution, startLine: lineCursor, endLine: lineCursor + lineCount, startAt: timestamps[lineIndex]!, endAt,
          byteOffset, byteCount: chunk.byteCount, storageKey: file.storageKey
        });
      }
      lineCursor += lineCount;
      byteOffset += chunk.byteCount;
      lineIndex = endIndex;
    }
  }

  private async resolveUser(handle?: string): Promise<{ id: string; handle: string } | null> {
    if (handle) {
      const existing = await getUserByHandle(this.db, handle);
      return existing ? { id: existing.id, handle: existing.handle } : null;
    } else {
      const user =
        await getUserByHandle(this.db, LOCAL_HANDLE) ??
        await createUser(this.db, { handle: LOCAL_HANDLE, email: "local@underfit.local", name: "Local", bio: null });
      return { id: user!.id, handle: user!.handle };
    }
  }

  private async resolveProject(userId: string, projectName: string): Promise<{ id: string }> {
    const project =
      await getProject(this.db, LOCAL_HANDLE, projectName) ??
      await createProject(this.db, { accountId: userId, name: projectName, description: "Auto-created for local backfill." });
    return { id: project!.id };
  }
}
