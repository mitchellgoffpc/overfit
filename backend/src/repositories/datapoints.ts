import type { Datapoint, ID } from "@underfit/types";

import type { Database } from "db";

const table = "datapoints";

export interface DatapointRow {
  id: string;
  runId: string;
  step: number | null;
  scalars: string;
  timestamp: string;
}

const toDatapoint = (row: DatapointRow): Datapoint => ({
  ...row,
  scalars: JSON.parse(row.scalars) as Record<string, number>,
});

export const createDatapointsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("step", "integer")
    .addColumn("scalars", "text", (col) => col.notNull())
    .addColumn("timestamp", "text", (col) => col.notNull())
    .execute();
};

export const listDatapoints = async (db: Database, runId: ID): Promise<Datapoint[]> => {
  const rows = await db.selectFrom(table).selectAll().where("runId", "=", runId).orderBy("step", "asc").execute();
  return rows.map(toDatapoint);
};

export const getDatapoint = async (db: Database, id: ID): Promise<Datapoint | undefined> => {
  const row = await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
  return row ? toDatapoint(row) : undefined;
};

export const upsertDatapoint = async (db: Database, datapoint: Datapoint): Promise<Datapoint> => {
  const row: DatapointRow = { ...datapoint, scalars: JSON.stringify(datapoint.scalars) };
  const { id: _, ...updates } = row;
  await db.insertInto(table).values(row).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return datapoint;
};
