import type { ID, User } from "@overfit/types";
import { sql } from "kysely";

import type { Database } from "db/database.js";

export type UsersTable = Omit<User, "handle" | "displayName">;

const table = "users";
const accountsTable = "accounts";

export const createUsersTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getUser = async (db: Database, id: ID): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select([
      `${table}.id as id`,
      `${table}.email as email`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.displayName as displayName`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
};

export const upsertUser = async (db: Database, user: User): Promise<User> => {
  const { handle, displayName, ...userRow } = user;
  await db
    .insertInto(accountsTable)
    .values({ id: user.id, handle, displayName })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, displayName }))
    .execute();

  const { id: _, ...updates } = userRow;
  await db.insertInto(table).values(userRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return user;
};

export const findUserByEmail = async (db: Database, email: string): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select([
      `${table}.id as id`,
      `${table}.email as email`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.displayName as displayName`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(sql`lower(${sql.ref(`${table}.email`)})`, "=", email.toLowerCase())
    .executeTakeFirst();
};

export const emailExists = async (db: Database, email: string): Promise<boolean> => {
  const row = await db.selectFrom(table).select("id").where(sql`lower(email)`, "=", email.toLowerCase()).executeTakeFirst();
  return Boolean(row);
};
