import type { Artifact, ID } from "@overfit/types";

import type { Database } from "db";
import { decodeJson, encodeJson } from "db/repositories/helpers.js";

type ArtifactsTable = Omit<Artifact, "metadata"> & { metadata: string | null };

const table = "artifacts";

const toRow = (artifact: Artifact): ArtifactsTable => ({ ...artifact, metadata: encodeJson(artifact.metadata) });
const fromRow = (row: ArtifactsTable): Artifact => ({ ...row, metadata: decodeJson(row.metadata) });

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
  return rows.map((row) => fromRow(row));
};

export const getArtifact = async (db: Database, id: ID): Promise<Artifact | undefined> => {
  const row = await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
  return row ? fromRow(row) : undefined;
};

export const upsertArtifact = async (db: Database, artifact: Artifact): Promise<Artifact> => {
  const row = toRow(artifact);
  const { id: _, ...updates } = row;
  await db.insertInto(table).values(row).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return artifact;
};
