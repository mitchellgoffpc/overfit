import { API_BASE } from "@underfit/types";

import type { Database } from "db";
import type { LogBuffer, LogChunk, LogReadEntry } from "logbuffer";
import { hasLogSegmentsAfterCursor, listLogSegmentsForCursor } from "repositories/logs";
import { getRun } from "repositories/runs";
import type { RouteApp, RouteHandler } from "routes/helpers";
import type { StorageBackend } from "storage";

type InsertLogChunkPayload = Partial<Pick<LogChunk, "workerId" | "timestamp" | "content">>;
type FlushLogBufferPayload = Partial<Pick<LogChunk, "workerId">>;
interface InsertLogChunkResponse { status: "buffered" };
interface FlushLogBufferResponse { status: "flushed" };
interface ListLogEntriesResponse {
  entries: LogReadEntry[];
  nextCursor: number;
  hasMore: boolean;
}

interface ListLogEntriesQuery {
  workerId?: string;
  cursor?: string;
  limit?: string;
}

const parseInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

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

const readLogSegmentLines = async (storage: StorageBackend, storageKey: string, startLine: number, endLine: number): Promise<string> => {
  const content = (await storage.readLogSegment(storageKey)).toString("utf8");
  return splitLines(content).slice(startLine, endLine).join("\n");
};

export function registerLogRoutes(app: RouteApp, db: Database, logBuffer: LogBuffer | null, storage: StorageBackend | null): void {
  const insertLogChunkHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, InsertLogChunkResponse, InsertLogChunkPayload> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRun(db, handle, projectName, runName);
    const { workerId, timestamp, content } = req.body;

    if (!logBuffer) {
      res.status(404).json({ error: "Log uploads are disabled" });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (!workerId || !timestamp || !content) {
      res.status(400).json({ error: "Log chunk fields are required: workerId, timestamp, content" });
    } else {
      await logBuffer.appendChunk({
        runId: run.id,
        workerId,
        timestamp,
        content
      });
      res.json({ status: "buffered" });
    }
  };

  const flushLogBufferHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, FlushLogBufferResponse, FlushLogBufferPayload> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRun(db, handle, projectName, runName);
    const workerId = req.body.workerId;

    if (!logBuffer) {
      res.status(404).json({ error: "Log uploads are disabled" });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (!workerId) {
      res.status(400).json({ error: "Log flush fields are required: workerId" });
    } else {
      await logBuffer.flush(run.id, workerId);
      res.json({ status: "flushed" });
    }
  };

  const listLogEntriesHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, ListLogEntriesResponse, unknown, ListLogEntriesQuery> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRun(db, handle, projectName, runName);
    const cursor = parseInteger(req.query.cursor ?? "");
    const limit = parseInteger(req.query.limit ?? "");
    const workerId = req.query.workerId;
    const pageLimit = limit ?? 2000;

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (!storage) {
      res.status(404).json({ error: "Log reads are disabled" });
    } else if (!workerId) {
      res.status(400).json({ error: "Log query param workerId is required" });
    } else if (req.query.cursor && (cursor === null || cursor < 0)) {
      res.status(400).json({ error: "Log query param cursor must be a non-negative integer" });
    } else if (req.query.limit && (limit === null || limit < 1)) {
      res.status(400).json({ error: "Log query param limit must be a positive integer" });
    } else {
      const entries: LogReadEntry[] = [];
      let nextCursor = cursor ?? 0;
      let remaining = pageLimit;
      let hasMore = false;
      const persistedSegments = await listLogSegmentsForCursor(db, run.id, workerId, { cursor: nextCursor, limit: 1024 });
      for (const segment of persistedSegments) {
        if (remaining < 1) {
          hasMore = true;
          break;
        }

        const entryStart = Math.max(segment.startLine, nextCursor);
        if (entryStart >= segment.endLine) {
          continue;
        }

        const entryEnd = Math.min(segment.endLine, entryStart + remaining);
        const content = await readLogSegmentLines(storage, segment.storageKey, entryStart - segment.startLine, entryEnd - segment.startLine);
        if (content.length > 0) {
          entries.push({ startLine: entryStart, endLine: entryEnd, content, startAt: segment.startAt, endAt: segment.endAt, source: "segment" });
          remaining -= entryEnd - entryStart;
          nextCursor = entryEnd;
        }

        if (entryEnd < segment.endLine) {
          hasMore = true;
          break;
        }
      }

      if (remaining > 0 && logBuffer) {
        const bufferedEntries = logBuffer.getBufferedEntries(run.id, workerId, nextCursor, remaining);
        for (const entry of bufferedEntries) {
          entries.push(entry);
          nextCursor = entry.endLine;
          remaining -= entry.endLine - entry.startLine;
          if (remaining < 1) {
            break;
          }
        }
      }

      if (!hasMore) {
        hasMore = await hasLogSegmentsAfterCursor(db, run.id, workerId, nextCursor) || Boolean(logBuffer?.hasBufferedLinesAfter(run.id, workerId, nextCursor));
      }

      res.json({ entries, nextCursor, hasMore });
    }
  };

  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, listLogEntriesHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, insertLogChunkHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs/flush`, flushLogBufferHandler);
}
