import type { ID, Scalar } from "@underfit/types";

import type { LineBufferConfig } from "buffers/lines";
import { LineBuffer } from "buffers/lines";
import type { Database } from "db";
import { createScalarSegment, getLatestScalarSegment } from "repositories/scalars";
import { getScalarStorageKey } from "storage/index";
import type { StorageBackend } from "storage/index";

export const SCALAR_RESOLUTIONS = [
  { resolution: 0, stride: 1 },
  { resolution: 1, stride: 10 },
  { resolution: 2, stride: 100 },
  { resolution: 3, stride: 1000 },
  { resolution: 4, stride: 10000 },
] as const;

interface ScalarScope {
  runId: ID;
}

interface BufferedScalarLine {
  timestamp: string;
  step: number | null;
  content: string;
}

interface ScalarAccumulator {
  sums: Record<string, number>;
  counts: Record<string, number>;
  pending: number;
  emitted: number;
  lastStep: number | null;
  lastTimestamp: string;
}

const toBufferedScalarLine = (scalar: Scalar): BufferedScalarLine => ({
  timestamp: scalar.timestamp,
  step: scalar.step,
  content: JSON.stringify(scalar)
});

const fromBufferedScalarLine = (line: BufferedScalarLine): Scalar => JSON.parse(line.content) as Scalar;

const createAccumulator = (): ScalarAccumulator => ({
  sums: {}, counts: {}, pending: 0, emitted: 0, lastStep: null, lastTimestamp: ""
});

const accumulateScalar = (acc: ScalarAccumulator, scalar: Scalar): void => {
  for (const [key, value] of Object.entries(scalar.values)) {
    acc.sums[key] = (acc.sums[key] ?? 0) + value;
    acc.counts[key] = (acc.counts[key] ?? 0) + 1;
  }
  acc.pending++;
  acc.lastStep = scalar.step;
  acc.lastTimestamp = scalar.timestamp;
};

const emitAveraged = (acc: ScalarAccumulator): BufferedScalarLine => {
  const values: Record<string, number> = {};
  for (const key of Object.keys(acc.sums)) {
    values[key] = acc.sums[key]! / acc.counts[key]!;
  }
  const scalar: Scalar = { step: acc.lastStep, values, timestamp: acc.lastTimestamp };
  acc.sums = {};
  acc.counts = {};
  acc.pending = 0;
  acc.emitted++;
  return toBufferedScalarLine(scalar);
};

export class ScalarBuffer {
  private readonly lineBuffers: LineBuffer<ScalarScope, BufferedScalarLine>[];
  private readonly accumulators = new Map<string, ScalarAccumulator[]>();

  constructor(
    private readonly db: Database,
    private readonly storage: StorageBackend,
    config: LineBufferConfig,
  ) {
    this.lineBuffers = SCALAR_RESOLUTIONS.map(({ resolution }) =>
      new LineBuffer<ScalarScope, BufferedScalarLine>(
        config,
        ({ runId }) => runId,
        async ({ scope, startLine, endLine, startAt, endAt, content }) => {
          const { storageKey, byteOffset, byteCount } = await this.storage.append(getScalarStorageKey(scope.runId, resolution), content);
          const segment = { runId: scope.runId, resolution, startLine, endLine, byteOffset, byteCount, startAt, endAt, storageKey };
          await createScalarSegment(this.db, segment);
        }
      )
    );
  }

  start(): void {
    for (const lb of this.lineBuffers) {
      lb.start();
    }
  }

  async stop(): Promise<void> {
    await this.emitPartialAccumulators();
    await Promise.all(this.lineBuffers.map(async (lb) => lb.stop()));
  }

  async appendScalars(runId: ID, startLine: number, scalars: Scalar[]): Promise<number> {
    const result = await this.lineBuffers[0]!.appendLines({ runId }, startLine, scalars.map(toBufferedScalarLine));
    await this.aggregateIntoTiers(runId, scalars);
    return result;
  }

  getScalars(runId: ID, resolution: number, cursor: number, limit: number): Scalar[] {
    return this.lineBuffers[resolution]!.getLines({ runId }, cursor, limit).map(fromBufferedScalarLine);
  }

  getEndLine(runId: ID): number | null {
    return this.lineBuffers[0]!.getEndLine({ runId });
  }

  async getLineCount(runId: ID, resolution: number): Promise<number> {
    const buffered = this.lineBuffers[resolution]!.getEndLine({ runId });
    if (buffered !== null) {
      return buffered;
    }
    const latest = await getLatestScalarSegment(this.db, runId, resolution);
    return latest?.endLine ?? 0;
  }

  async flush(runId: ID): Promise<void> {
    await this.emitPartialAccumulatorsForRun(runId);
    await Promise.all(this.lineBuffers.map(async (lb) => lb.flush({ runId })));
  }

  async flushAll(): Promise<void> {
    await this.emitPartialAccumulators();
    await Promise.all(this.lineBuffers.map(async (lb) => lb.flushAll()));
  }

  private getOrCreateAccumulators(runId: ID): ScalarAccumulator[] {
    let accs = this.accumulators.get(runId);
    if (!accs) {
      accs = SCALAR_RESOLUTIONS.map(() => createAccumulator());
      this.accumulators.set(runId, accs);
    }
    return accs;
  }

  private async aggregateIntoTiers(runId: ID, scalars: Scalar[]): Promise<void> {
    const accs = this.getOrCreateAccumulators(runId);
    for (const scalar of scalars) {
      for (let i = 1; i < SCALAR_RESOLUTIONS.length; i++) {
        const { stride } = SCALAR_RESOLUTIONS[i]!;
        const acc = accs[i]!;
        accumulateScalar(acc, scalar);
        if (acc.pending >= stride) {
          const startLine = acc.emitted;
          const line = emitAveraged(acc);
          await this.lineBuffers[i]!.appendLines({ runId }, startLine, [line]);
        }
      }
    }
  }

  private async emitPartialAccumulatorsForRun(runId: ID): Promise<void> {
    const accs = this.accumulators.get(runId);
    if (!accs) {
      return;
    }
    for (let i = 1; i < SCALAR_RESOLUTIONS.length; i++) {
      const acc = accs[i]!;
      if (acc.pending > 0) {
        const startLine = acc.emitted;
        const line = emitAveraged(acc);
        await this.lineBuffers[i]!.appendLines({ runId }, startLine, [line]);
      }
    }
  }

  private async emitPartialAccumulators(): Promise<void> {
    for (const runId of this.accumulators.keys()) {
      await this.emitPartialAccumulatorsForRun(runId);
    }
  }
}
