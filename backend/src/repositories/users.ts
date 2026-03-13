import type { ID, User } from "@underfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export type UserRow = Omit<User, "handle" | "name" | "type">;

export const table = "users";

const selectUserColumns = () => [
  `${table}.id as id`,
  `${table}.email as email`,
  `${table}.bio as bio`,
  `${accountsTable}.handle as handle`,
  `${accountsTable}.name as name`,
  `${accountsTable}.type as type`,
  `${table}.createdAt as createdAt`,
  `${table}.updatedAt as updatedAt`
] as const;

export const createUsersTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("email", "text", (col) => col.notNull())
    .addColumn("bio", "text")
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getUser = async (db: Database, id: ID): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select(selectUserColumns())
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
};

export const getUserByHandle = async (db: Database, handle: string): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select(selectUserColumns())
    .where(`${accountsTable}.handle`, "=", handle)
    .executeTakeFirst();
};

export const getUserByEmail = async (db: Database, email: string): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select(selectUserColumns())
    .where(sql`lower(${sql.ref(`${table}.email`)})`, "=", email.toLowerCase())
    .executeTakeFirst();
};

export const upsertUser = async (db: Database, user: Omit<User, "createdAt" | "updatedAt">): Promise<User> => {
  const payload: User = { ...user, createdAt: nowIso(), updatedAt: nowIso() };
  const { type: _type, handle, name, ...userRow } = payload;
  await db
    .insertInto(accountsTable)
    .values({ id: user.id, handle, name })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, name, type: "USER" }))
    .execute();

  const { id: _id, createdAt: __, ...updates } = userRow;
  await db.insertInto(table).values(userRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return await getUser(db, user.id) ?? payload;
};

export const updateUserProfile = async (
  db: Database,
  id: ID,
  updates: { name?: string; bio?: string | null }
): Promise<User | undefined> => {
  const { name, bio } = updates;
  if (bio !== undefined) {
    await db.updateTable(table).set({ bio, updatedAt: nowIso() }).where("id", "=", id).execute();
  }
  if (name) {
    await db.updateTable(accountsTable).set({ name }).where("id", "=", id).execute();
  }
  return await getUser(db, id);
};
