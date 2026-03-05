import type { ID, Project } from "@overfit/types";

import type { Database } from "db/database.js";

const table = "projects";

export const createProjectsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("description", "text")
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const listProjects = async (db: Database): Promise<Project[]> => {
  return await db.selectFrom(table).selectAll().execute();
};

export const getProject = async (db: Database, id: ID): Promise<Project | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const upsertProject = async (db: Database, project: Project): Promise<Project> => {
  const { id: _, ...updates } = project;
  await db.insertInto(table).values(project).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return project;
};
