import type { ID, Metric } from "@overfit/types";

import type { Database } from "db/database.js";

const table = "metrics";

export const createMetricsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("value", "real", (col) => col.notNull())
    .addColumn("step", "integer")
    .addColumn("timestamp", "text", (col) => col.notNull())
    .execute();
};

export const listMetrics = async (db: Database): Promise<Metric[]> => {
  return await db.selectFrom(table).selectAll().execute();
};

export const getMetric = async (db: Database, id: ID): Promise<Metric | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const upsertMetric = async (db: Database, metric: Metric): Promise<Metric> => {
  const { id: _, ...updates } = metric;
  await db.insertInto(table).values(metric).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return metric;
};
