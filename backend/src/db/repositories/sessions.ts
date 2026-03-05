import type { ID, Session } from "@overfit/types";

import type { Database } from "db/database.js";

const table = "sessions";

export const createSessionsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("userId", "text", (col) => col.references("users.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("expiresAt", "text", (col) => col.notNull())
    .execute();
};

export const getSession = async (db: Database, id: ID): Promise<Session | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const upsertSession = async (db: Database, session: Session): Promise<Session> => {
  const { id: _, ...updates } = session;
  await db.insertInto(table).values(session).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return session;
};

export const deleteSession = async (db: Database, id: ID): Promise<void> => {
  await db.deleteFrom(table).where("id", "=", id).execute();
};
