import { randomBytes } from "crypto";

import type { ID, ScalarSegment } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";

export const table = "scalar_segments";

export const createScalarSegmentsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("resolution", "integer", (col) => col.notNull())
    .addColumn("startLine", "integer", (col) => col.notNull())
    .addColumn("endLine", "integer", (col) => col.notNull())
    .addColumn("startAt", "text", (col) => col.notNull())
    .addColumn("endAt", "text", (col) => col.notNull())
    .addColumn("byteOffset", "integer", (col) => col.notNull())
    .addColumn("byteCount", "integer", (col) => col.notNull())
    .addColumn("storageKey", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addUniqueConstraint("scalar_segments_run_resolution_start_line_unique", ["runId", "resolution", "startLine"])
    .execute();
};

export const createScalarSegment = async (db: Database, segment: Omit<ScalarSegment, "id" | "createdAt">): Promise<ScalarSegment> => {
  const payload = { ...segment, id: randomBytes(12).toString("hex"), createdAt: nowIso() };
  await db.insertInto(table).values(payload).execute();
  return payload;
};

export const getLatestScalarSegment = async (db: Database, runId: ID, resolution = 0): Promise<ScalarSegment | undefined> => {
  return await db
    .selectFrom(table)
    .selectAll()
    .where("runId", "=", runId)
    .where("resolution", "=", resolution)
    .orderBy("endLine", "desc")
    .executeTakeFirst();
};

export const listScalarSegmentsForCursor = async (
  db: Database, runId: ID, resolution: number, cursor: number, count = Number.MAX_SAFE_INTEGER
): Promise<ScalarSegment[]> => {
  return await db
    .selectFrom(table)
    .selectAll()
    .where("runId", "=", runId)
    .where("resolution", "=", resolution)
    .where("endLine", ">", cursor)
    .where("startLine", "<", cursor + count)
    .orderBy("startLine", "asc")
    .execute();
};
