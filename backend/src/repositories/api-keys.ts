import type { ApiKey, ID } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "repositories/helpers";

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

export const listApiKeysByUser = async (db: Database, userId: ID): Promise<ApiKey[]> => {
  return await db.selectFrom(table).selectAll().where("userId", "=", userId).orderBy("createdAt", "desc").execute();
};

export const createApiKey = async (db: Database, key: Omit<ApiKey, "createdAt">): Promise<ApiKey> => {
  const payload: ApiKey = { ...key, createdAt: nowIso() };
  await db.insertInto(table).values(payload).execute();
  return payload;
};

export const deleteApiKey = async (db: Database, id: ID, userId: ID): Promise<void> => {
  await db.deleteFrom(table).where("id", "=", id).where("userId", "=", userId).execute();
};
