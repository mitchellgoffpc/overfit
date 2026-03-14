import { randomBytes } from "crypto";

import type { Artifact, ID } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "repositories/helpers";

export type ArtifactRow = Omit<Artifact, "metadata"> & { metadata: string | null };

const table = "artifacts";

export const createArtifactsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("version", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .addColumn("uri", "text")
    .addColumn("metadata", "text")
    .execute();
};

export const listArtifacts = async (db: Database): Promise<Artifact[]> => {
  const rows = await db.selectFrom(table).selectAll().execute();
  return rows.map((row) => ({ ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null }));
};

export const getArtifact = async (db: Database, id: ID): Promise<Artifact | undefined> => {
  const row = await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
  return row ? { ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null } : undefined;
};

export const insertArtifact = async (db: Database, artifact: Omit<Artifact, "id" | "createdAt" | "updatedAt">): Promise<Artifact> => {
  const payload: Artifact = { ...artifact, id: randomBytes(16).toString("hex"), createdAt: nowIso(), updatedAt: nowIso() };
  const row: ArtifactRow = { ...payload, metadata: payload.metadata ? JSON.stringify(payload.metadata) : null };
  await db.insertInto(table).values(row).execute();
  return payload;
};

export const updateArtifactUri = async (db: Database, id: ID, uri: string): Promise<Artifact | undefined> => {
  const result = await db.updateTable(table).set({ uri, updatedAt: nowIso() }).where("id", "=", id).executeTakeFirst();
  return result.numUpdatedRows ? await getArtifact(db, id) : undefined;
};
