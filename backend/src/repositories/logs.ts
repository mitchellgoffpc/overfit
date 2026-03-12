import type { ID, LogSegment } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "repositories/helpers";

export const table = "log_segments";

export const createLogSegmentsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("workerId", "text", (col) => col.notNull())
    .addColumn("startLine", "integer", (col) => col.notNull())
    .addColumn("endLine", "integer", (col) => col.notNull())
    .addColumn("startAt", "text", (col) => col.notNull())
    .addColumn("endAt", "text", (col) => col.notNull())
    .addColumn("byteCount", "integer", (col) => col.notNull())
    .addColumn("storageKey", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addUniqueConstraint("log_segments_run_worker_start_line_unique", ["runId", "workerId", "startLine"])
    .execute();
};

export const insertLogSegment = async (db: Database, segment: Omit<LogSegment, "createdAt">): Promise<LogSegment> => {
  const payload = { ...segment, createdAt: nowIso() };
  await db.insertInto(table).values(payload).execute();
  return payload;
};

export const getLatestLogSegment = async (db: Database, runId: ID, workerId: string): Promise<LogSegment | undefined> => {
  return await db
    .selectFrom(table)
    .selectAll()
    .where("runId", "=", runId)
    .where("workerId", "=", workerId)
    .orderBy("endLine", "desc")
    .executeTakeFirst();
};

export const listLogSegmentsForCursor = async (
  db: Database,
  runId: ID,
  workerId: string,
  options: { cursor: number; limit?: number }): Promise<LogSegment[]> => {
  const limit = options.limit ?? 1024;
  return await db
    .selectFrom(table)
    .selectAll()
    .where("runId", "=", runId)
    .where("workerId", "=", workerId)
    .where("endLine", ">", options.cursor)
    .orderBy("startLine", "asc")
    .limit(limit)
    .execute();
};

export const hasLogSegmentsAfterCursor = async (db: Database, runId: ID, workerId: string, cursor: number): Promise<boolean> => {
  const segment = await db
    .selectFrom(table)
    .select("id")
    .where("runId", "=", runId)
    .where("workerId", "=", workerId)
    .where("endLine", ">", cursor)
    .orderBy("startLine", "asc")
    .executeTakeFirst();
  return Boolean(segment);
};
