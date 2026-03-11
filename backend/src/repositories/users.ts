import type { ID, User } from "@underfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export type UserRow = Omit<User, "handle" | "displayName" | "type">;

export const table = "users";

const selectUserColumns = () => [
  `${table}.id as id`,
  `${table}.email as email`,
  `${table}.name as name`,
  `${table}.bio as bio`,
  `${accountsTable}.handle as handle`,
  `${accountsTable}.displayName as displayName`,
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
    .addColumn("name", "text")
    .addColumn("bio", "text")
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();

  const columns = await sql<{ name: string }>`PRAGMA table_info(${sql.table(table)})`.execute(db);
  const existing = new Set(columns.rows.map((row) => row.name));
  if (!existing.has("name")) { await db.schema.alterTable(table).addColumn("name", "text").execute(); }
  if (!existing.has("bio")) { await db.schema.alterTable(table).addColumn("bio", "text").execute(); }
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
  const { type: _type, handle, displayName, ...userRow } = payload;
  await db
    .insertInto(accountsTable)
    .values({ id: user.id, handle, displayName })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, displayName, type: "USER" }))
    .execute();

  const { id: _id, createdAt: __, ...updates } = userRow;
  await db.insertInto(table).values(userRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return await getUser(db, user.id) ?? payload;
};

export const updateUserProfile = async (
  db: Database,
  id: ID,
  updates: { name?: string | null; bio?: string | null; displayName?: string }
): Promise<User | undefined> => {
  const { displayName, ...userUpdates } = updates;
  if (Object.keys(userUpdates).length > 0) {
    await db.updateTable(table).set({ ...userUpdates, updatedAt: nowIso() }).where("id", "=", id).execute();
  }
  if (displayName) {
    await db.updateTable(accountsTable).set({ displayName }).where("id", "=", id).execute();
  }
  return await getUser(db, id);
};
