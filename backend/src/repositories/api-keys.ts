import { randomBytes } from "crypto";

import type { ApiKey, ApiKeyWithToken, ID, User } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";
import { selectUserColumns, table as usersTable } from "repositories/users";

export const table = "api_keys";

export const createApiKeysTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("userId", "text", (col) => col.references("users.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("label", "text")
    .addColumn("token", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .execute();
};

export const listApiKeys = async (db: Database, userId: ID): Promise<ApiKey[]> => {
  return await db.selectFrom(table).select(["id", "userId", "label", "createdAt"]).where("userId", "=", userId).orderBy("createdAt", "desc").execute();
};

export const createApiKey = async (db: Database, key: Omit<ApiKeyWithToken, "id" | "createdAt">): Promise<ApiKeyWithToken> => {
  const payload: ApiKeyWithToken = { ...key, id: randomBytes(12).toString("hex"), createdAt: nowIso() };
  await db.insertInto(table).values(payload).execute();
  return payload;
};

export const deleteApiKey = async (db: Database, id: ID, userId: ID): Promise<void> => {
  await db.deleteFrom(table).where("id", "=", id).where("userId", "=", userId).execute();
};

export const getUserByApiKey = async (db: Database, token: string): Promise<User | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(usersTable, `${usersTable}.id`, `${table}.userId`)
    .innerJoin("accounts", "accounts.id", `${usersTable}.id`)
    .select(selectUserColumns)
    .where(`${table}.token`, "=", token)
    .executeTakeFirst();
};
