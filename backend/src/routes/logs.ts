import { API_BASE } from "@underfit/types";
import type { LogPage } from "@underfit/types";

import type { Database } from "db";
import type { LogBuffer, LogLine } from "logbuffer";
import { listLogSegmentsForCursor } from "repositories/logs";
import { getRun } from "repositories/runs";
import type { RouteApp, RouteHandler } from "routes/helpers";
import type { StorageBackend } from "storage";

type InsertLogLinesPayload = Partial<{ workerId: string; lines: LogLine[] }>;
type FlushLogBufferPayload = Partial<{ workerId: string }>;
interface RunPathParams { handle: string; projectName: string; runName: string; }
interface InsertLogLinesResponse { status: "buffered" };
interface FlushLogBufferResponse { status: "flushed" };

interface ListLogEntriesQuery {
  workerId?: string;
  cursor?: string;
  count?: string;
}
const DEFAULT_LOG_LINE_COUNT = 10000;

const parseInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};
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

  const insertLogLinesHandler: RouteHandler<RunPathParams, InsertLogLinesResponse, InsertLogLinesPayload> = async (req, res) => {
    const run = await getPathRun(req.params);
    const { workerId, lines } = req.body;

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (!workerId || !Array.isArray(lines) || lines.length === 0 || lines.some((line) => !line.timestamp || typeof line.content !== "string")) {
      res.status(400).json({ error: "Log line fields are required: workerId, lines[{timestamp, content}]" });
    } else {
      await logBuffer.appendLines(run.id, workerId, normalizeLogLines(lines));
      res.json({ status: "buffered" });
    }
  };

  const flushLogBufferHandler: RouteHandler<RunPathParams, FlushLogBufferResponse, FlushLogBufferPayload> = async (req, res) => {
    const run = await getPathRun(req.params);
    const workerId = req.body.workerId;

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (!workerId) {
      res.status(400).json({ error: "Log flush fields are required: workerId" });
    } else {
      await logBuffer.flush(run.id, workerId);
      res.json({ status: "flushed" });
    }
  };

  const listLogEntriesHandler: RouteHandler<RunPathParams, LogPage, unknown, ListLogEntriesQuery> = async (req, res) => {
    const run = await getPathRun(req.params);
    const cursor = parseInteger(req.query.cursor ?? "0");
    const count = parseInteger(req.query.count ?? "");
    const workerId = req.query.workerId;
    const lineCount = count ?? DEFAULT_LOG_LINE_COUNT;

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (!workerId) {
      res.status(400).json({ error: "Log query param workerId is required" });
    } else if (cursor === null || cursor < 0) {
      res.status(400).json({ error: "Log query param cursor must be a non-negative integer" });
    } else if (req.query.count && (count === null || count < 1)) {
      res.status(400).json({ error: "Log query param count must be a positive integer" });
    } else {
      const persistedSegments = await listLogSegmentsForCursor(db, run.id, workerId, cursor, lineCount);
      if (persistedSegments.length > 0) {
        const entries = await Promise.all(persistedSegments.map(async ({ storageKey, startLine, endLine, startAt, endAt }) => {
          const clippedStartLine = Math.max(startLine, cursor);
          const content = await readLogSegmentLines(storage, storageKey, clippedStartLine - startLine, endLine - startLine);
          return { startLine: clippedStartLine, endLine, content, startAt, endAt };
        }));
        const nextCursor = entries[entries.length - 1].endLine;
        const hasMore = persistedSegments[persistedSegments.length - 1].endLine >= cursor;
        res.json({ entries, nextCursor, hasMore });
        return;
      }

      const bufferedLines = logBuffer.getLines(run.id, workerId, cursor, lineCount + 1);
      const visibleLines = bufferedLines.slice(0, lineCount);
      if (bufferedLines.length > 0) {
        const entry = {
          startLine: cursor,
          endLine: cursor + visibleLines.length,
          startAt: visibleLines[0].timestamp,
          endAt: visibleLines[visibleLines.length - 1].timestamp,
          content: visibleLines.map(({ content: lineContent }) => lineContent).join("\n")
        };
        res.json({ entries: [entry], nextCursor: cursor + visibleLines.length, hasMore: bufferedLines.length > lineCount });
        return;
      }

      res.json({ entries: [], nextCursor: cursor, hasMore: false });
    }
  };

  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, listLogEntriesHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, insertLogLinesHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs/flush`, flushLogBufferHandler);
}
