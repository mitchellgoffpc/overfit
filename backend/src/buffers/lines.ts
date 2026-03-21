import { z } from "zod";

export const LineBufferConfigSchema = z.strictObject({
  maxSegmentBytes: z.coerce.number().positive().default(256 * 1024),
  maxSegmentAgeMs: z.coerce.number().positive().default(30_000),
  flushIntervalMs: z.coerce.number().positive().default(1_000)
}).prefault({});
export type LineBufferConfig = z.infer<typeof LineBufferConfigSchema>;

export interface LineItem {
  timestamp: string;
  content: string;
}

interface LineBufferState<TScope, TItem extends LineItem> {
  scope: TScope;
  startLine: number;
  endLine: number;
  lines: TItem[];
  byteCount: number;
  firstBufferedAt: number;
}

export interface LineBufferSegment<TScope> {
  scope: TScope;
  startLine: number;
  endLine: number;
  startAt: string;
  endAt: string;
  content: Buffer;
}

const getLineContent = (lines: LineItem[]): string => lines.map(({ content }) => content).join("\n");
const getByteCount = (lines: LineItem[]): number => Buffer.byteLength(getLineContent(lines), "utf8");

export class LineBuffer<TScope, TItem extends LineItem> {
  private readonly buffers = new Map<string, LineBufferState<TScope, TItem>>();
  private readonly inFlightFlushes = new Map<string, Promise<void>>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: LineBufferConfig,
    private readonly scopeKey: (scope: TScope) => string,
    private readonly writeSegment: (segment: LineBufferSegment<TScope>) => Promise<void>,
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

  async appendLines(scope: TScope, startLine: number, lines: TItem[]): Promise<number> {
    if (lines.length === 0) {
      return startLine;
    }

    const key = this.scopeKey(scope);
    let state = this.buffers.get(key);
    if (!state) {
      state = { scope, startLine, endLine: startLine, lines: [], byteCount: 0, firstBufferedAt: Date.now() };
      this.buffers.set(key, state);
    } else if (state.endLine !== startLine) {
      return state.endLine;
    }

    const appendedStartLine = state.endLine;
    state.lines.push(...lines);
    state.endLine += lines.length;
    state.byteCount += getByteCount(lines) + (state.byteCount > 0 ? 1 : 0);
    if (state.byteCount >= this.config.maxSegmentBytes) {
      await this.flushKey(key);
    }
    return appendedStartLine;
  }

  getLines(scope: TScope, cursor: number, limit: number): TItem[] {
    const buffer = this.buffers.get(this.scopeKey(scope));
    if (!buffer || buffer.endLine <= cursor || limit < 1) {
      return [];
    }

    const startLine = Math.max(buffer.startLine, cursor);
    const endLine = Math.min(buffer.endLine, startLine + limit);
    return buffer.lines.slice(startLine - buffer.startLine, endLine - buffer.startLine);
  }

  getEndLine(scope: TScope): number | null {
    const buffer = this.buffers.get(this.scopeKey(scope));
    return buffer ? buffer.endLine : null;
  }

  async flush(scope: TScope): Promise<void> {
    await this.flushKey(this.scopeKey(scope));
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
    if (!state || state.lines.length === 0) {
      return;
    }

    const flushLineCount = state.lines.length;
    const snapshot = { ...state, lines: [...state.lines] };
    this.inFlightFlushes.set(key, this.writeSnapshot(snapshot));
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

  private async writeSnapshot(snapshot: LineBufferState<TScope, TItem>): Promise<void> {
    const startAt = snapshot.lines[0]!.timestamp;
    const endAt = snapshot.lines[snapshot.lines.length - 1]!.timestamp;
    const content = Buffer.from(getLineContent(snapshot.lines) + "\n", "utf8");
    await this.writeSegment({
      scope: snapshot.scope,
      startLine: snapshot.startLine,
      endLine: snapshot.endLine,
      startAt,
      endAt,
      content
    });
  }
}
