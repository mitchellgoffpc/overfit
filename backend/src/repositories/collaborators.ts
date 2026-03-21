import type { Collaborator, ID, User } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";
import { table as accountsTable } from "repositories/accounts";
import { selectUserColumns, table as usersTable } from "repositories/users";

export const table = "collaborators";

const getCollaboratorId = (projectId: ID, userId: ID): ID => `${projectId}:${userId}`;

export const createCollaboratorsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("projectId", "text", (col) => col.references("projects.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("userId", "text", (col) => col.references("users.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getCollaborator = async (db: Database, projectId: ID, userId: ID): Promise<Collaborator | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", getCollaboratorId(projectId, userId)).executeTakeFirst();
};

export const createCollaborator = async (db: Database, projectId: ID, userId: ID): Promise<Collaborator | undefined> => {
  const id = getCollaboratorId(projectId, userId);
  const payload: Collaborator = { id, projectId, userId, createdAt: nowIso(), updatedAt: nowIso() };
  const result = await db.insertInto(table).values(payload).onConflict((oc) => oc.column("id").doNothing()).executeTakeFirst();
  return result.numInsertedOrUpdatedRows ? payload : undefined;
};

export const deleteCollaborator = async (db: Database, projectId: ID, userId: ID): Promise<boolean> => {
  const result = await db.deleteFrom(table).where("id", "=", getCollaboratorId(projectId, userId)).executeTakeFirst();
  return result.numDeletedRows > 0;
};

export const listCollaborators = async (db: Database, projectId: ID): Promise<User[]> => {
  return await db
    .selectFrom(table)
    .innerJoin(usersTable, `${usersTable}.id`, `${table}.userId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${usersTable}.id`)
    .select(selectUserColumns)
    .where(`${table}.projectId`, "=", projectId)
    .execute();
};

export const isCollaborator = async (db: Database, projectId: ID, userId: ID): Promise<boolean> => {
  const row = await db.selectFrom(table).select("id").where("id", "=", getCollaboratorId(projectId, userId)).executeTakeFirst();
  return !!row;
};
