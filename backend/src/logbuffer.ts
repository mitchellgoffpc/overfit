import type { ID } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { getLatestLogSegment, insertLogSegment } from "repositories/logs";
import { getLogSegmentStorageKey } from "storage";
import type { StorageBackend } from "storage";

export const LogBufferConfigSchema = z.strictObject({
  maxSegmentBytes: z.coerce.number().positive().default(256 * 1024),
  maxSegmentAgeMs: z.coerce.number().positive().default(30_000),
  flushIntervalMs: z.coerce.number().positive().default(1_000)
}).prefault({});
export type LogBufferConfig = z.infer<typeof LogBufferConfigSchema>;

interface LogBufferState {
  runId: ID;
  workerId: string;
  startLine: number;
  endLine: number;
  lines: LogLine[];
  byteCount: number;
  firstBufferedAt: number;
}

export interface LogLine {
  timestamp: string;
  content: string;
}

const getKey = (runId: ID, workerId: string): string => `${runId}:${workerId}`;
const getLineContent = (lines: LogLine[]): string => lines.map(({ content }) => content).join("\n");
const getByteCount = (lines: LogLine[]): number => Buffer.byteLength(getLineContent(lines), "utf8");

export class LogBuffer {
  private readonly buffers = new Map<string, LogBufferState>();
  private readonly inFlightFlushes = new Map<string, Promise<void>>();
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

  async appendLines(runId: ID, workerId: string, lines: LogLine[]): Promise<void> {
    if (lines.length === 0) {
      return;
    }

    const key = getKey(runId, workerId);
    let startLine = 0;
    if (!this.buffers.has(key)) {
      startLine = (await getLatestLogSegment(this.db, runId, workerId))?.endLine ?? 0;
    }

    // another append could have happend in the meantime, so...
    let state = this.buffers.get(key);
    if (!state) {
      state = { runId, workerId, startLine, endLine: startLine, lines: [], byteCount: 0, firstBufferedAt: Date.now() };
      this.buffers.set(key, state);
    }

    state.lines.push(...lines);
    state.endLine += lines.length;
    state.byteCount += getByteCount(lines) + (state.byteCount > 0 ? 1 : 0); // +1 for the extra newline
    if (state.byteCount >= this.config.maxSegmentBytes) {
      await this.flushKey(key);
    }
  }

  getLines(runId: ID, workerId: string, cursor: number, limit: number): LogLine[] {
    const buffer = this.buffers.get(getKey(runId, workerId));
    if (!buffer || buffer.endLine <= cursor || limit < 1) {
      return [];
    }

    const startLine = Math.max(buffer.startLine, cursor);
    const endLine = Math.min(buffer.endLine, startLine + limit);
    return buffer.lines.slice(startLine - buffer.startLine, endLine - buffer.startLine);
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

  async flush(runId: ID, workerId: string): Promise<void> {
    await this.flushKey(getKey(runId, workerId));
  }

  async flushAll(): Promise<void> {
    await Promise.all([...this.buffers.keys()].map(async (key) => {
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
    if (!state || state.lines.length === 0) {
      return;
    }

    const flushLineCount = state.lines.length;
    const snapshot = { ...state, lines: [...state.lines] };
    this.inFlightFlushes.set(key, this.writeLogSegment(snapshot));
    try {
      await this.inFlightFlushes.get(key);
      state.lines.splice(0, flushLineCount);
      state.byteCount = getByteCount(state.lines);
      state.startLine = snapshot.endLine;
      state.endLine = state.startLine + state.lines.length;
      if (state.lines.length === 0) {
        this.buffers.delete(key);
      } else {
        state.firstBufferedAt = Date.now();
      }
    } finally {
      this.inFlightFlushes.delete(key);
    }
  }

  private async writeLogSegment(state: LogBufferState): Promise<void> {
    const startAt = state.lines[0]!.timestamp;
    const endAt = state.lines[state.lines.length - 1]!.timestamp;
    const content = getLineContent(state.lines);
    const storageKey = await this.storage.write(getLogSegmentStorageKey(state.runId, state.workerId, state.startLine), Buffer.from(content, "utf8"));
    const { lines: _, firstBufferedAt: __, ...row } = state;
    await insertLogSegment(this.db, { ...row, startAt, endAt, storageKey });
  }
}
