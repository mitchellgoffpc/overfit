import type { ID, User } from "@overfit/types";
import { sql } from "kysely";

import type { Database } from "db/database.js";

const table = "users";

export const createUsersTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("username", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getUser = async (db: Database, id: ID): Promise<User | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const upsertUser = async (db: Database, user: User): Promise<User> => {
  const { id: _, ...updates } = user;
  await db.insertInto(table).values(user).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return user;
};

export const findUserByEmail = async (db: Database, email: string): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .selectAll()
    .where(sql`lower(email)`, "=", email.toLowerCase())
    .executeTakeFirst();
};

export const findUserByUsername = async (db: Database, username: string): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .selectAll()
    .where(sql`lower(username)`, "=", username.toLowerCase())
    .executeTakeFirst();
};

export const emailExists = async (db: Database, email: string): Promise<boolean> => {
  const row = await db.selectFrom(table).select("id").where(sql`lower(email)`, "=", email.toLowerCase()).executeTakeFirst();
  return Boolean(row);
};

export const usernameExists = async (db: Database, username: string): Promise<boolean> => {
  const row = await db.selectFrom(table).select("id").where(sql`lower(username)`, "=", username.toLowerCase()).executeTakeFirst();
  return Boolean(row);
};
