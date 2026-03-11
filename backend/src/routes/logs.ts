import type { LogSegment } from "@underfit/types";
import { API_BASE } from "@underfit/types";

import type { Database } from "db";
import type { LogBuffer, LogChunk } from "logbuffer";
import { listLogSegments } from "repositories/logs";
import { getRun } from "repositories/runs";
import type { RouteApp, RouteHandler } from "routes/helpers";

type InsertLogChunkPayload = Partial<Pick<LogChunk, "workerId" | "timestamp" | "content">>;
type FlushLogBufferPayload = Partial<Pick<LogChunk, "workerId">>;
interface InsertLogChunkResponse { status: "buffered" };
interface FlushLogBufferResponse { status: "flushed" };

interface ListLogSegmentsQuery {
  workerId?: string;
  start?: string;
  limit?: string;
}

const parseInteger = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export function registerLogRoutes(app: RouteApp, db: Database, logBuffer: LogBuffer | null): void {
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

  const listLogSegmentsHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, LogSegment[], unknown, ListLogSegmentsQuery> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRun(db, handle, projectName, runName);
    const start = parseInteger(req.query.start ?? "");
    const limit = parseInteger(req.query.limit ?? "");
    const workerId = req.query.workerId;

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (!workerId) {
      res.status(400).json({ error: "Log segment query param workerId is required" });
    } else if (req.query.start && (start === null || start < 0)) {
      res.status(400).json({ error: "Log segment query param start must be a non-negative integer" });
    } else if (req.query.limit && (limit === null || limit < 1)) {
      res.status(400).json({ error: "Log segment query param limit must be a positive integer" });
    } else {
      const segments = await listLogSegments(db, run.id, workerId, { start: start ?? undefined, limit: limit ?? undefined });
      res.json(segments);
    }
  };

  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, listLogSegmentsHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs`, insertLogChunkHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/logs/flush`, flushLogBufferHandler);
}
