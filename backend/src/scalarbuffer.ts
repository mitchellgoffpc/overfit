import type { ID, Scalar } from "@underfit/types";

import type { Database } from "db";
import type { LineBufferConfig } from "linebuffer";
import { LineBuffer } from "linebuffer";
import { createScalarSegment } from "repositories/scalars";
import { getScalarSegmentStorageKey } from "storage";
import type { StorageBackend } from "storage";

interface ScalarScope {
  runId: ID;
}

interface BufferedScalarLine {
  timestamp: string;
  step: number | null;
  content: string;
}

const toBufferedScalarLine = (scalar: Scalar): BufferedScalarLine => ({
  timestamp: scalar.timestamp,
  step: scalar.step,
  content: JSON.stringify(scalar)
});

const fromBufferedScalarLine = (line: BufferedScalarLine): Scalar => JSON.parse(line.content) as Scalar;

export class ScalarBuffer {
  private readonly lineBuffer: LineBuffer<ScalarScope, BufferedScalarLine>;

  constructor(
    private readonly db: Database,
    private readonly storage: StorageBackend,
    config: LineBufferConfig,
  ) {
    this.lineBuffer = new LineBuffer(
      config,
      ({ runId }) => runId,
      async ({ scope, startLine, endLine, byteCount, startAt, endAt, content }) => {
        const storageKey = await this.storage.write(getScalarSegmentStorageKey(scope.runId, startLine), Buffer.from(content, "utf8"));
        await createScalarSegment(this.db, { runId: scope.runId, startLine, endLine, byteCount, startAt, endAt, storageKey });
      }
    );
  }

  start(): void {
    this.lineBuffer.start();
  }

  async stop(): Promise<void> {
    await this.lineBuffer.stop();
  }

  async appendScalars(runId: ID, startLine: number, scalars: Scalar[]): Promise<number> {
    return await this.lineBuffer.appendLines({ runId }, startLine, scalars.map(toBufferedScalarLine));
  }

  getScalars(runId: ID, cursor: number, limit: number): Scalar[] {
    return this.lineBuffer.getLines({ runId }, cursor, limit).map(fromBufferedScalarLine);
  }

  getEndLine(runId: ID): number | null {
    return this.lineBuffer.getEndLine({ runId });
  }

  async flush(runId: ID): Promise<void> {
    await this.lineBuffer.flush({ runId });
  }

  async flushAll(): Promise<void> {
    await this.lineBuffer.flushAll();
  }
}
