import type { ID, Run } from "@underfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { decodeJson, encodeJson, nowIso } from "repositories/helpers.js";
import { table as projectsTable } from "repositories/projects";
import { table as usersTable } from "repositories/users";

export type RunRow = Omit<Run, "user" | "projectName" | "projectOwner" | "metadata"> & { userId: ID; metadata: string | null };
type InsertRunRow = Omit<RunRow, "createdAt" | "updatedAt" | "metadata"> & { metadata: Run["metadata"] };
type UpdateRunRow = Partial<Pick<InsertRunRow, "status" | "metadata">>;

export const table = "runs";

const selectRuns = (db: Database) => db
  .selectFrom(table)
  .innerJoin(usersTable, `${usersTable}.id`, `${table}.userId`)
  .innerJoin(accountsTable, `${accountsTable}.id`, `${usersTable}.id`)
  .innerJoin(projectsTable, `${projectsTable}.id`, `${table}.projectId`)
  .innerJoin(`${accountsTable} as projectAccount`, "projectAccount.id", `${projectsTable}.accountId`)
  .select([
    `${table}.id as id`,
    `${table}.projectId as projectId`,
    `${accountsTable}.handle as user`,
    `${projectsTable}.name as projectName`,
    `projectAccount.handle as projectOwner`,
    `${table}.name as name`,
    `${table}.status as status`,
    `${table}.createdAt as createdAt`,
    `${table}.updatedAt as updatedAt`,
    `${table}.metadata as metadata`
  ]);

export const createRunsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("projectId", "text", (col) => col.references("projects.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("userId", "text", (col) => col.references("users.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("status", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .addColumn("metadata", "text")
    .addUniqueConstraint("runs_project_id_name_unique", ["projectId", "name"])
    .execute();
};

export const listUserRuns = async (db: Database, userId: ID): Promise<Run[]> => {
  const rows = await selectRuns(db).where(`${table}.userId`, "=", userId).orderBy(`${table}.createdAt`, "desc").execute();
  return rows.map((row) => ({ ...row, metadata: decodeJson(row.metadata) }));
};

export const listProjectRuns = async (db: Database, handle: string, projectName: string): Promise<Run[]> => {
  const rows = await selectRuns(db)
    .where("projectAccount.handle", "=", handle)
    .where(`${projectsTable}.name`, "=", projectName)
    .orderBy(`${table}.createdAt`, "desc")
    .execute();
  return rows.map((row) => ({ ...row, metadata: decodeJson(row.metadata) }));
};

const getRunById = async (db: Database, id: ID): Promise<Run | undefined> => {
  const row = await selectRuns(db).where(`${table}.id`, "=", id).executeTakeFirst();
  return row ? { ...row, metadata: decodeJson(row.metadata) } : undefined;
};

export const getRun = async (db: Database, handle: string, projectName: string, runName: string): Promise<Run | undefined> => {
  const row = await selectRuns(db)
    .where("projectAccount.handle", "=", handle)
    .where(`${projectsTable}.name`, "=", projectName)
    .where(`${table}.name`, "=", runName)
    .executeTakeFirst();
  return row ? { ...row, metadata: decodeJson(row.metadata) } : undefined;
};

export const hasRun = async (db: Database, id: ID): Promise<boolean> => {
  return Boolean(await db.selectFrom(table).select("id").where("id", "=", id).executeTakeFirst());
};

export const insertRun = async (db: Database, run: InsertRunRow): Promise<Run> => {
  const payload = { ...run, createdAt: nowIso(), updatedAt: nowIso(), metadata: encodeJson(run.metadata) };
  await db.insertInto(table).values(payload).execute();
  return await getRunById(db, run.id) ?? payload;
};

export const updateRun = async (db: Database, id: ID, updates: UpdateRunRow): Promise<Run | undefined> => {
  const payload = { ...updates, updatedAt: nowIso() };
  if (Object.hasOwn(updates, "metadata")) { payload.metadata = encodeJson(updates.metadata ?? null); }
  await db.updateTable(table).set(payload).where("id", "=", id).execute();
  return await getRunById(db, id);
};
