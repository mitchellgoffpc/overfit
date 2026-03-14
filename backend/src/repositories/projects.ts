import type { ID, Project } from "@underfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export const table = "projects";
const runsTable = "runs";

export type ProjectRow = Omit<Project, "owner"> & { accountId: ID };

const projectSelect = [
  `${table}.id as id`,
  `${accountsTable}.handle as owner`,
  `${table}.name as name`,
  `${table}.description as description`,
  `${table}.createdAt as createdAt`,
  `${table}.updatedAt as updatedAt`
] as const;

export const createProjectsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("accountId", "text", (col) => col.references("accounts.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .addUniqueConstraint("projects_account_id_name_unique", ["accountId", "name"])
    .execute();
};

export const listProjects = async (db: Database, handle: string): Promise<Project[]> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.accountId`)
    .select(projectSelect)
    .where(`${accountsTable}.handle`, "=", handle)
    .execute();
};

const getProjectById = async (db: Database, id: ID): Promise<Project | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.accountId`)
    .select(projectSelect)
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
};

export const getProject = async (db: Database, handle: string, name: string): Promise<Project | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.accountId`)
    .select(projectSelect)
    .where(`${accountsTable}.handle`, "=", handle)
    .where(`${table}.name`, "=", name)
    .executeTakeFirst();
};

export const upsertProject = async (db: Database, project: Omit<ProjectRow, "createdAt" | "updatedAt">): Promise<Project> => {
  const payload: ProjectRow = { ...project, createdAt: nowIso(), updatedAt: nowIso() };
  const { id: _, createdAt: __, ...updates } = payload;
  await db.insertInto(table).values(payload).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  const result = await getProjectById(db, project.id);
  if (!result) { throw new Error("RUH ROH"); }
  return result;
};

export const listProjectsByUserActivity = async (db: Database, userId: ID): Promise<Project[]> => {
  return await db
    .selectFrom(runsTable)
    .innerJoin(table, `${table}.id`, `${runsTable}.projectId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.accountId`)
    .select(projectSelect)
    .where(`${runsTable}.userId`, "=", userId)
    .groupBy([
      `${table}.id`,
      `${accountsTable}.handle`,
      `${table}.name`,
      `${table}.description`,
      `${table}.createdAt`,
      `${table}.updatedAt`
    ])
    .orderBy(sql`count(${sql.ref(`${runsTable}.id`)})`, "desc")
    .execute();
};
