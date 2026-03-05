import type { ID, Run } from "@overfit/types";

import type { Database } from "db/database.js";
import { decodeJson, encodeJson } from "db/repositories/helpers.js";

type RunsTable = Omit<Run, "metadata"> & { metadata: string | null };

const table = "runs";

const toRow = (run: Run): RunsTable => ({ ...run, metadata: encodeJson(run.metadata) });
const fromRow = (row: RunsTable): Run => ({ ...row, metadata: decodeJson(row.metadata) });

export const createRunsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("projectId", "text", (col) => col.references("projects.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .addColumn("startedAt", "text")
    .addColumn("finishedAt", "text")
    .addColumn("metadata", "text")
    .execute();
};

export const listRuns = async (db: Database): Promise<Run[]> => {
  const rows = await db.selectFrom(table).selectAll().execute();
  return rows.map((row) => fromRow(row));
};

export const getRun = async (db: Database, id: ID): Promise<Run | undefined> => {
  const row = await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
  return row ? fromRow(row) : undefined;
};

export const hasRun = async (db: Database, id: ID): Promise<boolean> => {
  return Boolean(await db.selectFrom(table).select("id").where("id", "=", id).executeTakeFirst());
};

export const upsertRun = async (db: Database, run: Run): Promise<Run> => {
  const row = toRow(run);
  const { id: _, ...updates } = row;
  await db.insertInto(table).values(row).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return run;
};
