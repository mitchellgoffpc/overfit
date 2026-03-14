import { randomBytes } from "crypto";

import type { ID, User, Account } from "@underfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export type UserRow = Omit<User, "handle" | "type">;

export const table = "users";

const selectUserColumns = () => [
  `${table}.id as id`,
  `${table}.email as email`,
  `${table}.name as name`,
  `${table}.bio as bio`,
  `${accountsTable}.handle as handle`,
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
    .addColumn("name", "text", (col) => col.notNull())
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

export const createUser = async (db: Database, user: Omit<User, "id" | "createdAt" | "updatedAt" | "type">): Promise<User> => {
  const id = randomBytes(16).toString("hex");
  const createdAt = nowIso();
  const updatedAt = nowIso();
  const payload: User = { ...user, id, type: "USER", createdAt, updatedAt };
  await db.insertInto(accountsTable).values({ id, handle: user.handle, type: "USER" }).execute();
  await db.insertInto(table).values({ id, email: user.email, name: user.name, bio: user.bio, createdAt, updatedAt }).execute();
  return await getUser(db, id) ?? payload;
};

export const updateUser = async (db: Database, id: ID, updates: Partial<Omit<User, keyof Account | "createdAt" | "updatedAt">>): Promise<User> => {
  await db.updateTable(table).set({ ...updates, updatedAt: nowIso() }).where("id", "=", id).execute();
  const user = await getUser(db, id);
  if (!user) { throw new Error(`User not found: ${id}`); }
  return user;
};
