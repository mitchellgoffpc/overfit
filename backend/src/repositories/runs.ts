import { randomBytes } from "crypto";

import type { ID, Run } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";
import { table as accountsTable } from "repositories/accounts";
import { table as projectsTable } from "repositories/projects";
import { table as usersTable } from "repositories/users";

export type RunRow = Omit<Run, "user" | "projectName" | "projectOwner" | "config"> & { userId: ID; config: string | null };
type CreateRunRow = Pick<Run, "projectId" | "name" | "status" | "config"> & { userId: ID };
type UpdateRunRow = Partial<Pick<Run, "status" | "config">>;
type UpdateRunByIdRow = Partial<Pick<Run, "projectId" | "name" | "status" | "config"> & { userId: ID }>;

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
    `${table}.config as config`
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
    .addColumn("config", "text")
    .addUniqueConstraint("runs_project_id_name_unique", ["projectId", "name"])
    .execute();
};

export const listUserRuns = async (db: Database, userId: ID): Promise<Run[]> => {
  const rows = await selectRuns(db).where(`${table}.userId`, "=", userId).orderBy(`${table}.createdAt`, "desc").execute();
  return rows.map((row) => ({ ...row, config: row.config ? JSON.parse(row.config) as Record<string, unknown> : null }));
};

export const listProjectRuns = async (db: Database, handle: string, projectName: string): Promise<Run[]> => {
  const rows = await selectRuns(db)
    .where("projectAccount.handle", "=", handle)
    .where(`${projectsTable}.name`, "=", projectName)
    .orderBy(`${table}.createdAt`, "desc")
    .execute();
  return rows.map((row) => ({ ...row, config: row.config ? JSON.parse(row.config) as Record<string, unknown> : null }));
};

export const getRunById = async (db: Database, id: ID): Promise<Run | undefined> => {
  const row = await selectRuns(db).where(`${table}.id`, "=", id).executeTakeFirst();
  return row ? { ...row, config: row.config ? JSON.parse(row.config) as Record<string, unknown> : null } : undefined;
};

export const getRun = async (db: Database, handle: string, projectName: string, runName: string): Promise<Run | undefined> => {
  const row = await selectRuns(db)
    .where("projectAccount.handle", "=", handle)
    .where(`${projectsTable}.name`, "=", projectName)
    .where(`${table}.name`, "=", runName)
    .executeTakeFirst();
  return row ? { ...row, config: row.config ? JSON.parse(row.config) as Record<string, unknown> : null } : undefined;
};

export const createRun = async (db: Database, run: CreateRunRow): Promise<Run | undefined> => {
  const payload = { ...run, id: randomBytes(16).toString("hex"), createdAt: nowIso(), updatedAt: nowIso(), config: JSON.stringify(run.config) };
  const result = await db.insertInto(table).values(payload).onConflict((oc) => oc.columns(["projectId", "name"]).doNothing()).executeTakeFirst();
  return result.numInsertedOrUpdatedRows ? await getRunById(db, payload.id) : undefined;
};

export const createRunWithId = async (db: Database, run: CreateRunRow & { id: ID }): Promise<Run | undefined> => {
  const payload = { ...run, createdAt: nowIso(), updatedAt: nowIso(), config: JSON.stringify(run.config) };
  const result = await db.insertInto(table).values(payload).onConflict((oc) => oc.columns(["projectId", "name"]).doNothing()).executeTakeFirst();
  return result.numInsertedOrUpdatedRows ? await getRunById(db, payload.id) : await getRunById(db, run.id);
};

export const updateRunById = async (db: Database, id: ID, updates: UpdateRunByIdRow): Promise<Run | undefined> => {
  const config = updates.config === undefined ? undefined : JSON.stringify(updates.config);
  const payload = {
    projectId: updates.projectId,
    userId: updates.userId,
    name: updates.name,
    status: updates.status,
    updatedAt: nowIso(),
    ...config !== undefined && { config }
  };
  const result = await db.updateTable(table).set(payload).where("id", "=", id).executeTakeFirst();
  return result.numUpdatedRows ? await getRunById(db, id) : undefined;
};

export const updateRun = async (db: Database, handle: string, projectName: string, runName: string, updates: UpdateRunRow): Promise<Run | undefined> => {
  const config = updates.config === undefined ? undefined : JSON.stringify(updates.config);
  const payload = { status: updates.status, updatedAt: nowIso(), ...config !== undefined && { config } };
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
