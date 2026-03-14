import { API_BASE } from "@underfit/types";
import type { LogPage } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import type { LogBuffer, LogLine } from "logbuffer";
import { getLatestLogSegment, listLogSegmentsForCursor } from "repositories/logs";
import { getRun } from "repositories/runs";
import type { StorageBackend } from "storage";

const CreateLogLineSchema = z.strictObject({
  timestamp: z.string().min(1),
  content: z.string()
});
const CreateLogLinesBodySchema = z.strictObject({
  workerId: z.string().min(1),
  startLine: z.number().int().min(0),
  lines: z.array(CreateLogLineSchema).min(1)
});
const FlushLogBufferBodySchema = z.strictObject({
  workerId: z.string().min(1)
});
const ListLogEntriesQuerySchema = z.strictObject({
  workerId: z.string().min(1),
  cursor: z.coerce.number().int().min(0).prefault(0),
  count: z.coerce.number().int().positive().exactOptional().prefault(10000)
});

type CreateLogLinesPayload = z.infer<typeof CreateLogLinesBodySchema>;
type FlushLogBufferPayload = z.infer<typeof FlushLogBufferBodySchema>;
type ListLogEntriesQuery = z.infer<typeof ListLogEntriesQuerySchema>;
type CreateLogLinesResponse = { status: "buffered" } | { error: string; expectedStartLine: number };

interface RunPathParams { handle: string; projectName: string; runName: string; }

const normalizeLogLines = (lines: LogLine[]): LogLine[] => lines.flatMap((line) => line.content.split("\n").map((content) => ({ timestamp: line.timestamp, content })));

const readLogSegmentLines = async (storage: StorageBackend, storageKey: string, startLine: number, endLine: number): Promise<string> => {
  const content = (await storage.read(storageKey)).toString("utf8");
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines.slice(startLine, endLine).join("\n");
};

export function registerLogRoutes(app: RouteApp, db: Database, logBuffer: LogBuffer, storage: StorageBackend): void {
  const getPathRun = async (params: RunPathParams) => {
    return await getRun(db, params.handle.trim().toLowerCase(), params.projectName.trim().toLowerCase(), params.runName.trim().toLowerCase());
  };

  const createLogLinesHandler: RouteHandler<RunPathParams, CreateLogLinesResponse, CreateLogLinesPayload> = async (req, res) => {
    const { success, error, data } = CreateLogLinesBodySchema.safeParse(req.body);
    const run = await getPathRun(req.params);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      const bufferedEndLine = logBuffer.getEndLine(run.id, data.workerId);
      const expectedStartLine = bufferedEndLine ?? (await getLatestLogSegment(db, run.id, data.workerId))?.endLine ?? 0;
      if (data.startLine !== expectedStartLine) {
        res.status(409).json({ error: "Invalid startLine", expectedStartLine });
        return;
      }

      const appendedStartLine = await logBuffer.appendLines(run.id, data.workerId, data.startLine, normalizeLogLines(data.lines));
      if (appendedStartLine !== data.startLine) {
        res.status(409).json({ error: "Invalid startLine", expectedStartLine: appendedStartLine });
      } else {
        res.json({ status: "buffered" });
      }
    }
  };

  const flushLogBufferHandler: RouteHandler<RunPathParams, { status: "flushed" }, FlushLogBufferPayload> = async (req, res) => {
    const { success, error, data } = FlushLogBufferBodySchema.safeParse(req.body);
    const run = await getPathRun(req.params);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      await logBuffer.flush(run.id, data.workerId);
      res.json({ status: "flushed" });
    }
  };

  const listLogEntriesHandler: RouteHandler<RunPathParams, LogPage, unknown, ListLogEntriesQuery> = async (req, res) => {
    const { success, error, data } = ListLogEntriesQuerySchema.safeParse(req.query);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const { workerId, cursor, count: lineCount } = data;
    const run = await getPathRun(req.params);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      const persistedSegments = await listLogSegmentsForCursor(db, run.id, workerId, cursor, lineCount);
      if (persistedSegments.length > 0) {
        const entries = await Promise.all(persistedSegments.map(async ({ storageKey, startLine, endLine, startAt, endAt }) => {
          const clippedStartLine = Math.max(startLine, cursor);
          const content = await readLogSegmentLines(storage, storageKey, clippedStartLine - startLine, endLine - startLine);
          return { startLine: clippedStartLine, endLine, content, startAt, endAt };
        }));
        const nextCursor = entries[entries.length - 1]!.endLine;
        const hasMore = persistedSegments[persistedSegments.length - 1]!.endLine >= cursor;
        res.json({ entries, nextCursor, hasMore });
        return;
      }

      const bufferedLines = logBuffer.getLines(run.id, workerId, cursor, lineCount + 1);
      const visibleLines = bufferedLines.slice(0, lineCount);
      if (bufferedLines.length > 0) {
        const entry = {
          startLine: cursor,
          endLine: cursor + visibleLines.length,
          startAt: visibleLines[0]!.timestamp,
          endAt: visibleLines[visibleLines.length - 1]!.timestamp,
          content: visibleLines.map(({ content: lineContent }) => lineContent).join("\n")
        };
        res.json({ entries: [entry], nextCursor: cursor + visibleLines.length, hasMore: bufferedLines.length > lineCount });
        return;
      }

      res.json({ entries: [], nextCursor: cursor, hasMore: false });
    }
  };

  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, listLogEntriesHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, createLogLinesHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs/flush`, flushLogBufferHandler);
}
