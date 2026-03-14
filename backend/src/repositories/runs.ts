import { randomBytes } from "crypto";

import type { ID, Run } from "@underfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";
import { table as projectsTable } from "repositories/projects";
import { table as usersTable } from "repositories/users";

export type RunRow = Omit<Run, "user" | "projectName" | "projectOwner" | "metadata"> & { userId: ID; metadata: string | null };
type InsertRunRow = Pick<Run, "projectId" | "name" | "status" | "metadata"> & { userId: ID };
type UpdateRunRow = Partial<Pick<Run, "status" | "metadata">>;

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
  return rows.map((row) => ({ ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null }));
};

export const listProjectRuns = async (db: Database, handle: string, projectName: string): Promise<Run[]> => {
  const rows = await selectRuns(db)
    .where("projectAccount.handle", "=", handle)
    .where(`${projectsTable}.name`, "=", projectName)
    .orderBy(`${table}.createdAt`, "desc")
    .execute();
  return rows.map((row) => ({ ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null }));
};

const getRunById = async (db: Database, id: ID): Promise<Run | undefined> => {
  const row = await selectRuns(db).where(`${table}.id`, "=", id).executeTakeFirst();
  return row ? { ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null } : undefined;
};

export const getRun = async (db: Database, handle: string, projectName: string, runName: string): Promise<Run | undefined> => {
  const row = await selectRuns(db)
    .where("projectAccount.handle", "=", handle)
    .where(`${projectsTable}.name`, "=", projectName)
    .where(`${table}.name`, "=", runName)
    .executeTakeFirst();
  return row ? { ...row, metadata: row.metadata ? JSON.parse(row.metadata) as Record<string, unknown> : null } : undefined;
};

export const insertRun = async (db: Database, run: InsertRunRow): Promise<Run> => {
  const payload = { ...run, id: randomBytes(16).toString("hex"), createdAt: nowIso(), updatedAt: nowIso(), metadata: JSON.stringify(run.metadata) };
  await db.insertInto(table).values(payload).execute();
  const result = await getRunById(db, payload.id);
  if (!result) { throw new Error("RUH ROH"); }
  return result;
};

export const updateRun = async (db: Database, id: ID, updates: UpdateRunRow): Promise<Run | undefined> => {
  const metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
  const payload = { status: updates.status, updatedAt: nowIso(), ...metadata && { metadata } };
  const result = await db.updateTable(table).set(payload).where("id", "=", id).executeTakeFirst();
  return result.numUpdatedRows ? await getRunById(db, id) : undefined;
};

export const updateRunByName = async (db: Database, handle: string, projectName: string, runName: string, updates: UpdateRunRow): Promise<Run | undefined> => {
  const metadata = updates.metadata ? JSON.stringify(updates.metadata) : null;
  const payload = { status: updates.status, updatedAt: nowIso(), ...metadata && { metadata } };
  const result = await db.updateTable(table)
    .set(payload)
    .where("id", "in", db.selectFrom(table)
      .innerJoin(projectsTable, `${projectsTable}.id`, `${table}.projectId`)
      .innerJoin(`${accountsTable} as projectAccount`, "projectAccount.id", `${projectsTable}.accountId`)
      .select(`${table}.id`)
      .where("projectAccount.handle", "=", handle)
      .where(`${projectsTable}.name`, "=", projectName)
      .where(`${table}.name`, "=", runName))
    .executeTakeFirst();
  return result.numUpdatedRows ? await getRun(db, handle, projectName, runName) : undefined;
};
