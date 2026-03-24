import type { ID } from "@underfit/types";

import type { LineBufferConfig } from "buffers/lines";
import { LineBuffer, LineBufferConfigSchema } from "buffers/lines";
import type { Database } from "db";
import { createLogSegment } from "repositories/logs";
import { getLogStorageKey } from "storage/index";
import type { StorageBackend } from "storage/index";

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
      async ({ scope, startLine, endLine, startAt, endAt, content }) => {
        const { storageKey, byteOffset, byteCount } = await this.storage.append(getLogStorageKey(scope.runId, scope.workerId), content);
        const segment = { runId: scope.runId, workerId: scope.workerId, startLine, endLine, byteOffset, byteCount, startAt, endAt, storageKey };
        await createLogSegment(this.db, segment);
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
