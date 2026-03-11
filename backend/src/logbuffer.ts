import { randomBytes } from "crypto";

import type { ID } from "@underfit/types";

import type { LogBufferConfig } from "config";
import type { Database } from "db";
import { getLatestLogSegment, insertLogSegment } from "repositories/logs";
import type { StorageBackend } from "storage";

interface LogBufferState {
  runId: ID;
  workerId: string;
  startAt: string;
  endAt: string;
  chunks: string[];
  byteCount: number;
  firstBufferedAt: number;
}

export interface LogChunk {
  runId: ID;
  workerId: string;
  timestamp: string;
  content: string;
}

const getKey = (runId: ID, workerId: string): string => `${runId}:${workerId}`;

export class LogBuffer {
  private readonly buffers = new Map<string, LogBufferState>();
  private readonly inFlightFlushes = new Map<string, Promise<void>>();
  private readonly config: LogBufferConfig;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly db: Database,
    private readonly storage: StorageBackend,
    private readonly config: LogBufferConfig,
  ) {}

  start(): void {
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => {
        void this.flushExpired();
      }, this.config.flushIntervalMs);
      this.flushTimer.unref();
    }
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flushAll();
  }

  async appendChunk(chunk: LogChunk): Promise<void> {
    if (!chunk.content) {
      return;
    }

    const now = Date.now();
    const key = getKey(chunk.runId, chunk.workerId);
    const existing = this.buffers.get(key);

    if (!existing) {
      this.buffers.set(key, {
        runId: chunk.runId,
        workerId: chunk.workerId,
        startAt: chunk.timestamp,
        endAt: chunk.timestamp,
        chunks: [chunk.content],
        byteCount: Buffer.byteLength(chunk.content, "utf8"),
        firstBufferedAt: now
      });
    } else {
      existing.startAt = chunk.timestamp < existing.startAt ? chunk.timestamp : existing.startAt;
      existing.endAt = chunk.timestamp > existing.endAt ? chunk.timestamp : existing.endAt;
      existing.chunks.push(chunk.content);
      existing.byteCount += Buffer.byteLength(chunk.content, "utf8");
    }

    const state = this.buffers.get(key);
    if (state && state.byteCount >= this.config.maxSegmentBytes) {
      await this.flushKey(key);
    }
  }

  async flush(runId: ID, workerId: string): Promise<void> {
    await this.flushKey(getKey(runId, workerId));
  }

  async flushAll(): Promise<void> {
    await Promise.all([...this.buffers.keys()].map(async (key) => {
      await this.flushKey(key);
    }));
  }

  private async flushExpired(): Promise<void> {
    const now = Date.now();
    const expiredKeys = [...this.buffers.entries()]
      .filter(([, state]) => now - state.firstBufferedAt >= this.config.maxSegmentAgeMs)
      .map(([key]) => key);

    await Promise.all(expiredKeys.map(async (key) => {
      await this.flushKey(key);
    }));
  }

  private async flushKey(key: string): Promise<void> {
    const inFlight = this.inFlightFlushes.get(key);
    if (inFlight) {
      await inFlight;
      return;
    }

    const state = this.buffers.get(key);
    if (state) {
      this.buffers.delete(key);
      this.inFlightFlushes.set(key, this.writeLogSegment(state));
      try {
        await this.inFlightFlushes.get(key);
      } finally {
        this.inFlightFlushes.delete(key);
      }
    }
  }

  private async writeLogSegment(state: LogBufferState): Promise<void> {
    const content = state.chunks.join("");
    const lineCount = content.length > 0 ? content.split("\n").length : 0;
    const latestSegment = await getLatestLogSegment(this.db, state.runId, state.workerId);
    const segmentIndex = latestSegment ? latestSegment.segmentIndex + 1 : 0;
    const storageKey = await this.storage.writeLogSegment(state.runId, state.workerId, segmentIndex, Buffer.from(content, "utf8"));
    await insertLogSegment(this.db, {
      id: randomBytes(12).toString("hex"),
      runId: state.runId,
      workerId: state.workerId,
      segmentIndex,
      startAt: state.startAt,
      endAt: state.endAt,
      lineCount,
      byteCount: state.byteCount,
      storageKey
    });
  }
}
