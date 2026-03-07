import type { ID, User } from "@overfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";

export type UsersTable = Omit<User, "handle" | "displayName" | "type">;

export const table = "users";

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
      `${accountsTable}.type as type`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
};

export const getUserByEmail = async (db: Database, email: string): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select([
      `${table}.id as id`,
      `${table}.email as email`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.displayName as displayName`,
      `${accountsTable}.type as type`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(sql`lower(${sql.ref(`${table}.email`)})`, "=", email.toLowerCase())
    .executeTakeFirst();
};

export const upsertUser = async (db: Database, user: User): Promise<User> => {
  const { type: _type, handle, displayName, ...userRow } = user;
  await db
    .insertInto(accountsTable)
    .values({ id: user.id, handle, displayName })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, displayName, type: "USER" }))
    .execute();

  const { id: _id, ...updates } = userRow;
  await db.insertInto(table).values(userRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return user;
};
