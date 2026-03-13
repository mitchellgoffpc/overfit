import { randomBytes } from "crypto";

import type { ID, LogEntry } from "@underfit/types";

import type { Database } from "db";
import { getLatestLogSegment, insertLogSegment } from "repositories/logs";
import { getLogSegmentStorageKey } from "storage";
import type { StorageBackend } from "storage";

export interface LogBufferConfig {
  maxSegmentBytes: number;
  maxSegmentAgeMs: number;
  flushIntervalMs: number;
}

interface LogBufferState {
  runId: ID;
  workerId: string;
  startLine: number;
  endLine: number;
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
const splitLines = (content: string): string[] => {
  if (content.length === 0) {
    return [];
  }
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
};
const countLines = (content: string): number => splitLines(content).length;
const sliceContentByLineRange = (content: string, startLine: number, endLine: number): string => (
  splitLines(content).slice(startLine, endLine).join("\n")
);

export class LogBuffer {
  private readonly buffers = new Map<string, LogBufferState>();
  private readonly flushingBuffers = new Map<string, LogBufferState>();
  private readonly nextLineByKey = new Map<string, number>();
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
    if (!this.nextLineByKey.has(key)) {
      const latestSegment = await getLatestLogSegment(this.db, chunk.runId, chunk.workerId);
      this.nextLineByKey.set(key, latestSegment?.endLine ?? 0);
    }

    const chunkLineCount = countLines(chunk.content);
    const existing = this.buffers.get(key);

    if (!existing) {
      const startLine = this.nextLineByKey.get(key) ?? 0;
      const endLine = startLine + chunkLineCount;
      this.nextLineByKey.set(key, endLine);
      this.buffers.set(key, {
        runId: chunk.runId,
        workerId: chunk.workerId,
        startLine,
        endLine,
        startAt: chunk.timestamp,
        endAt: chunk.timestamp,
        chunks: [chunk.content],
        byteCount: Buffer.byteLength(chunk.content, "utf8"),
        firstBufferedAt: now
      });
    } else {
      const endLine = existing.startLine + countLines(existing.chunks.join("") + chunk.content);
      this.nextLineByKey.set(key, endLine);
      existing.startAt = chunk.timestamp < existing.startAt ? chunk.timestamp : existing.startAt;
      existing.endAt = chunk.timestamp > existing.endAt ? chunk.timestamp : existing.endAt;
      existing.endLine = endLine;
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
    await Promise.all([...this.buffers.keys(), ...this.flushingBuffers.keys()].map(async (key) => {
      await this.flushKey(key);
    }));
  }

  getBufferedEntries(runId: ID, workerId: string, cursor: number, limit: number): LogEntry[] {
    if (limit < 1) {
      return [];
    }

    const key = getKey(runId, workerId);
    const states: LogBufferState[] = [];
    const flushing = this.flushingBuffers.get(key);
    const active = this.buffers.get(key);
    if (flushing) {
      states.push(flushing);
    }
    if (active) {
      states.push(active);
    }

    let nextStart = cursor;
    let remaining = limit;
    const entries: LogEntry[] = [];
    for (const state of states.sort((a, b) => a.startLine - b.startLine)) {
      if (state.endLine <= nextStart || remaining < 1) {
        continue;
      }

      const entryStart = Math.max(state.startLine, nextStart);
      const entryEnd = Math.min(state.endLine, entryStart + remaining);
      const content = sliceContentByLineRange(state.chunks.join(""), entryStart - state.startLine, entryEnd - state.startLine);
      if (content.length === 0) {
        continue;
      }

      entries.push({ startLine: entryStart, endLine: entryEnd, content, startAt: state.startAt, endAt: state.endAt });
      remaining -= entryEnd - entryStart;
      nextStart = entryEnd;
    }

    return entries;
  }

  hasBufferedLinesAfter(runId: ID, workerId: string, cursor: number): boolean {
    const key = getKey(runId, workerId);
    const flushing = this.flushingBuffers.get(key);
    const active = this.buffers.get(key);
    return (flushing?.endLine ?? -1) > cursor || (active?.endLine ?? -1) > cursor;
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
      this.flushingBuffers.set(key, state);
      this.inFlightFlushes.set(key, this.writeLogSegment(state));
      try {
        await this.inFlightFlushes.get(key);
      } finally {
        this.flushingBuffers.delete(key);
        this.inFlightFlushes.delete(key);
      }
    }
  }

  private async writeLogSegment(state: LogBufferState): Promise<void> {
    const content = state.chunks.join("");
    const storageKey = await this.storage.write(getLogSegmentStorageKey(state.runId, state.workerId, state.startLine), Buffer.from(content, "utf8"));
    await insertLogSegment(this.db, {
      id: randomBytes(12).toString("hex"),
      runId: state.runId,
      workerId: state.workerId,
      startLine: state.startLine,
      endLine: state.endLine,
      startAt: state.startAt,
      endAt: state.endAt,
      byteCount: state.byteCount,
      storageKey
    });
  }
}
