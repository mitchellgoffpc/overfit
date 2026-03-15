import { randomBytes } from "crypto";

import type { ID, User, Account } from "@underfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { nowIso } from "helpers";

export type UserRow = Omit<User, "handle" | "type">;

export const table = "users";
const accountsTable = "accounts"; // avoid circular imports

export const selectUserColumns = [
  `${table}.id as id`,
  `${table}.email as email`,
  `${table}.name as name`,
  `${table}.bio as bio`,
  `${accountsTable}.handle as handle`,
  sql<"USER">`'USER'`.as("type"),
  `${table}.createdAt as createdAt`,
  `${table}.updatedAt as updatedAt`
] as const;

const selectUsers = (db: Database) => db.selectFrom(table).innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`).select(selectUserColumns);

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
    .addUniqueConstraint("users_email_unique", ["email"])
    .execute();
};

export const getUser = async (db: Database, id: ID): Promise<User | undefined> => {
  return await selectUsers(db).where(`${table}.id`, "=", id).executeTakeFirst();
};

export const getUserByHandle = async (db: Database, handle: string): Promise<User | undefined> => {
  return await selectUsers(db).where(`${accountsTable}.handle`, "=", handle).executeTakeFirst();
};

export const getUserByEmail = async (db: Database, email: string): Promise<User | undefined> => {
  return await selectUsers(db).where(sql`lower(${sql.ref(`${table}.email`)})`, "=", email.toLowerCase()).executeTakeFirst();
};

export const createUser = async (db: Database, user: Omit<User, "id" | "createdAt" | "updatedAt" | "type">): Promise<User | undefined> => {
  const id = randomBytes(16).toString("hex");
  const createdAt = nowIso();
  try {
    return await db.transaction().execute(async (tx) => {
      const accountResult = await tx
        .insertInto(accountsTable)
        .values({ id, handle: user.handle, type: "USER" })
        .onConflict((oc) => oc.column("handle").doNothing())
        .executeTakeFirst();
      const userResult = await tx
        .insertInto(table)
        .values({ id, email: user.email, name: user.name, bio: user.bio, createdAt, updatedAt: createdAt })
        .onConflict((oc) => oc.column("email").doNothing())
        .executeTakeFirst();
      if (!accountResult.numInsertedOrUpdatedRows || !userResult.numInsertedOrUpdatedRows) { throw new Error(); }
      return { ...user, email: user.email.toLowerCase(), id, type: "USER", createdAt, updatedAt: createdAt };
    });
  } catch {
    return undefined;
  }
};

export const updateUser = async (db: Database, id: ID, updates: Partial<Omit<User, keyof Account | "createdAt" | "updatedAt">>): Promise<User | undefined> => {
  const result = await db.updateTable(table).set({ ...updates, updatedAt: nowIso() }).where("id", "=", id).executeTakeFirst();
  return result.numUpdatedRows ? await getUser(db, id) : undefined;
};
