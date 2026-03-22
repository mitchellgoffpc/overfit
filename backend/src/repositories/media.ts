import type { ID, Media } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";

export type MediaRow = Omit<Media, "metadata"> & { metadata: string | null };

export const table = "media";

export const createMediaTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("key", "text", (col) => col.notNull())
    .addColumn("step", "integer")
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("storageKey", "text", (col) => col.notNull())
    .addColumn("metadata", "text")
    .addColumn("createdAt", "text", (col) => col.notNull())
    .execute();
};

const parseRow = (row: MediaRow): Media => ({
  ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null
});

export const createMedia = async (db: Database, media: Omit<Media, "createdAt">): Promise<Media | undefined> => {
  const payload: Media = { ...media, createdAt: nowIso() };
  const row: MediaRow = { ...payload, metadata: payload.metadata ? JSON.stringify(payload.metadata) : null };
  const result = await db
    .insertInto(table)
    .columns(["id", "runId", "key", "step", "type", "storageKey", "metadata", "createdAt"])
    .expression((eb) => eb
      .selectFrom("runs")
      .select([
        eb.val(row.id).as("id"),
        eb.val(row.runId).as("runId"),
        eb.val(row.key).as("key"),
        eb.val(row.step).as("step"),
        eb.val(row.type).as("type"),
        eb.val(row.storageKey).as("storageKey"),
        eb.val(row.metadata).as("metadata"),
        eb.val(row.createdAt).as("createdAt"),
      ])
      .where("runs.id", "=", row.runId))
    .executeTakeFirst();
  return result.numInsertedOrUpdatedRows ? payload : undefined;
};

export const getMedia = async (db: Database, id: ID): Promise<Media | undefined> => {
  const row = await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
  return row ? parseRow(row) : undefined;
};

export const listMedia = async (db: Database, runId: ID, key?: string, step?: number): Promise<Media[]> => {
  let query = db.selectFrom(table).selectAll().where("runId", "=", runId);
  if (key !== undefined) { query = query.where("key", "=", key); }
  if (step !== undefined) { query = query.where("step", "=", step); }
  const rows = await query.orderBy("createdAt", "asc").execute();
  return rows.map(parseRow);
};
