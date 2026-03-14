import type { ID, UserAuth } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";

const table = "user_auth";

export const createUserAuthTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey().references("users.id").onDelete("cascade").onUpdate("cascade"))
    .addColumn("passwordHash", "text", (col) => col.notNull())
    .addColumn("passwordSalt", "text", (col) => col.notNull())
    .addColumn("passwordIterations", "integer", (col) => col.notNull())
    .addColumn("passwordDigest", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getUserAuth = async (db: Database, id: ID): Promise<UserAuth | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const createUserAuth = async (db: Database, auth: Omit<UserAuth, "createdAt" | "updatedAt">): Promise<UserAuth> => {
  const payload = { ...auth, createdAt: nowIso(), updatedAt: nowIso() };
  await db.insertInto(table).values(payload).execute();
  return payload;
};
