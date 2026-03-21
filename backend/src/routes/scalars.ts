import { API_BASE } from "@underfit/types";
import type { Scalar } from "@underfit/types";
import { z } from "zod";

import type { ScalarBuffer } from "buffers/scalars";
import type { Database } from "db";
import { formatZodError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { getRun } from "repositories/runs";
import { getLatestScalarSegment, listScalarSegmentsForCursor } from "repositories/scalars";
import { requireAuth } from "routes/auth";
import type { StorageBackend } from "storage";

const ScalarSchema = z.strictObject({
  step: z.number().nullable().exactOptional().prefault(null),
  values: z.record(z.string(), z.number()),
  timestamp: z.string().min(1, "Scalar fields are required: timestamp")
});
const CreateScalarsBodySchema = z.strictObject({
  startLine: z.number().int().min(0),
  scalars: z.array(ScalarSchema).min(1)
});
const FlushScalarBufferBodySchema = z.strictObject({});

type CreateScalarsBody = z.infer<typeof CreateScalarsBodySchema>;
type CreateScalarsResponse = { status: "buffered" } | { error: string; expectedStartLine: number };

const readScalarSegment = async (storage: StorageBackend, storageKey: string): Promise<Scalar[]> => {
  const content = (await storage.read(storageKey)).toString("utf8");
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.map((line) => JSON.parse(line) as Scalar);
};

export function registerScalarRoutes(app: RouteApp, db: Database, scalarBuffer: ScalarBuffer, storage: StorageBackend): void {
  const getPathRun = async (params: { handle: string; projectName: string; runName: string }) => {
    return await getRun(db, params.handle.trim().toLowerCase(), params.projectName.trim().toLowerCase(), params.runName.trim().toLowerCase());
  };

  const createScalarHandler: RouteHandler<
    { handle: string; projectName: string; runName: string }, CreateScalarsResponse, CreateScalarsBody
  > = async (req, res) => {
    const { success, error, data } = CreateScalarsBodySchema.safeParse(req.body);
    const run = await getPathRun(req.params);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      const bufferedEndLine = scalarBuffer.getEndLine(run.id);
      const expectedStartLine = bufferedEndLine ?? (await getLatestScalarSegment(db, run.id))?.endLine ?? 0;
      if (data.startLine !== expectedStartLine) {
        res.status(409).json({ error: "Invalid startLine", expectedStartLine });
        return;
      }

      const appendedStartLine = await scalarBuffer.appendScalars(run.id, data.startLine, data.scalars);
      if (appendedStartLine !== data.startLine) {
        res.status(409).json({ error: "Invalid startLine", expectedStartLine: appendedStartLine });
      } else {
        res.json({ status: "buffered" });
      }
    }
  };

  const getScalarsHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Scalar[]> = async (req, res) => {
    const run = await getPathRun(req.params);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const persistedSegments = await listScalarSegmentsForCursor(db, run.id, 0);
    const persistedScalars = (await Promise.all(persistedSegments.map(async ({ storageKey }) => await readScalarSegment(storage, storageKey)))).flat();
    const nextCursor = persistedSegments.length === 0 ? 0 : persistedSegments[persistedSegments.length - 1]!.endLine;
    const bufferedScalars = scalarBuffer.getScalars(run.id, nextCursor, Number.MAX_SAFE_INTEGER);
    res.json([...persistedScalars, ...bufferedScalars]);
  };

  const flushScalarBufferHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, { status: "flushed" }> = async (req, res) => {
    const { success, error } = FlushScalarBufferBodySchema.safeParse(req.body);
    const run = await getPathRun(req.params);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      await scalarBuffer.flush(run.id);
      res.json({ status: "flushed" });
    }
  };

  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/scalars`, getScalarsHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/scalars`, requireAuth(db), createScalarHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/scalars/flush`, requireAuth(db), flushScalarBufferHandler);
}
