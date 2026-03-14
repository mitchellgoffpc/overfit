import type { ID } from "@underfit/types";

import type { Database } from "db";
import type { LineBufferConfig } from "linebuffer";
import { LineBuffer, LineBufferConfigSchema } from "linebuffer";
import { createLogSegment } from "repositories/logs";
import { getLogSegmentStorageKey } from "storage";
import type { StorageBackend } from "storage";

export { LineBufferConfigSchema as LogBufferConfigSchema };
export type LogBufferConfig = LineBufferConfig;

export interface LogLine {
  timestamp: string;
  content: string;
}

interface LogScope {
  runId: ID;
  workerId: string;
}

export class LogBuffer {
  private readonly lineBuffer: LineBuffer<LogScope, LogLine>;

  constructor(
    private readonly db: Database,
    private readonly storage: StorageBackend,
    config: LogBufferConfig,
  ) {
    this.lineBuffer = new LineBuffer(
      config,
      ({ runId, workerId }) => `${runId}:${workerId}`,
      async ({ scope, startLine, endLine, byteCount, startAt, endAt, content }) => {
        const storageKey = await this.storage.write(getLogSegmentStorageKey(scope.runId, scope.workerId, startLine), Buffer.from(content, "utf8"));
        await createLogSegment(this.db, { runId: scope.runId, workerId: scope.workerId, startLine, endLine, byteCount, startAt, endAt, storageKey });
      }
    );
  }

  start(): void {
    this.lineBuffer.start();
  }

  async stop(): Promise<void> {
    await this.lineBuffer.stop();
  }

  async appendLines(runId: ID, workerId: string, startLine: number, lines: LogLine[]): Promise<number> {
    return await this.lineBuffer.appendLines({ runId, workerId }, startLine, lines);
  }

  getLines(runId: ID, workerId: string, cursor: number, limit: number): LogLine[] {
    return this.lineBuffer.getLines({ runId, workerId }, cursor, limit);
  }

  getEndLine(runId: ID, workerId: string): number | null {
    return this.lineBuffer.getEndLine({ runId, workerId });
  }

  async flush(runId: ID, workerId: string): Promise<void> {
    await this.lineBuffer.flush({ runId, workerId });
  }

  async flushAll(): Promise<void> {
    await this.lineBuffer.flushAll();
  }
}
