import { randomBytes } from "crypto";

import type { ID, Session } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";

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

export const createSession = async (db: Database, session: Omit<Session, "id" | "createdAt">): Promise<Session> => {
  const payload = { ...session, id: randomBytes(32).toString("base64url"), createdAt: nowIso() };
  await db.insertInto(table).values(payload).onConflict((oc) => oc.column("id").doNothing()).executeTakeFirst();
  return payload;
};

export const deleteSession = async (db: Database, id: ID): Promise<void> => {
  await db.deleteFrom(table).where("id", "=", id).execute();
};
