import { randomBytes } from "crypto";

import type { Artifact, ID } from "@underfit/types";
import { artifactStatus } from "@underfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { nowIso } from "helpers";
import { getArtifactStoragePrefix } from "storage/index";

export type ArtifactRow = Omit<Artifact, "metadata"> & { metadata: string | null };
type CreateArtifactRow = Pick<Artifact, "projectId" | "runId" | "step" | "name" | "type" | "declaredFileCount" | "metadata">;

const table = "artifacts";

const parseRow = (row: ArtifactRow): Artifact => ({
  ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null
});

export const createArtifactsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("projectId", "text", (col) => col.references("projects.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("runId", "text", (col) => col.references("runs.id").onDelete("cascade").onUpdate("cascade"))
    .addColumn("step", "integer")
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull().defaultTo("open"))
    .addColumn("storageKey", "text", (col) => col.notNull())
    .addColumn("declaredFileCount", "integer", (col) => col.notNull())
    .addColumn("uploadedFileCount", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .addColumn("finalizedAt", "text")
    .addColumn("metadata", "text")
    .addCheckConstraint("artifacts_status_check", sql`status in (${sql.join(artifactStatus.map((value) => sql.lit(value)))})`)
    .addCheckConstraint("artifacts_step_requires_run_check", sql`runId is not null or step is null`)
    .addCheckConstraint("artifacts_uploaded_count_check", sql`uploadedFileCount >= 0 and uploadedFileCount <= declaredFileCount`)
    .addForeignKeyConstraint("artifacts_project_run_fk", ["projectId", "runId"], "runs", ["projectId", "id"], (cb) =>
      cb.onDelete("cascade").onUpdate("cascade"))
    .execute();
};

export const listProjectArtifacts = async (db: Database, projectId: ID): Promise<Artifact[]> => {
  const rows = await db.selectFrom(table).selectAll().where("projectId", "=", projectId).orderBy("createdAt", "desc").execute();
  return rows.map(parseRow);
};

export const getArtifact = async (db: Database, id: ID): Promise<Artifact | undefined> => {
  const row = await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
  return row ? parseRow(row) : undefined;
};

export const createArtifact = async (db: Database, artifact: CreateArtifactRow): Promise<Artifact | undefined> => {
  const id = randomBytes(16).toString("hex");
  const storageKey = getArtifactStoragePrefix(artifact.projectId, id, artifact.runId);
  const payload: Artifact = { ...artifact, id, storageKey, createdAt: nowIso(), updatedAt: nowIso(), finalizedAt: null, uploadedFileCount: 0, status: "open" };
  const row = { ...payload, metadata: payload.metadata ? JSON.stringify(payload.metadata) : null };
  try {
    await db.insertInto(table).values(row).executeTakeFirstOrThrow();
    return payload;
  } catch {
    return undefined;
  }
};

export const incrementArtifactUploadedFileCount = async (db: Database, id: ID): Promise<Artifact | undefined> => {
  const result = await db.updateTable(table)
    .set({ uploadedFileCount: sql<number>`uploadedFileCount + 1`, updatedAt: nowIso() })
    .where("id", "=", id)
    .where("status", "=", "open")
    .whereRef("uploadedFileCount", "<", "declaredFileCount")
    .executeTakeFirst();
  return result.numUpdatedRows ? await getArtifact(db, id) : undefined;
};

export const finalizeArtifact = async (db: Database, id: ID): Promise<boolean> => {
  const now = nowIso();
  const result = await db.updateTable(table)
    .set({ status: "finalized", finalizedAt: now, updatedAt: now })
    .where("id", "=", id)
    .where("status", "=", "open")
    .executeTakeFirst();
  return result.numUpdatedRows > 0;
};
