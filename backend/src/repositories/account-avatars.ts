import type { AccountAvatar, ID } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";
import { table as accountsTable } from "repositories/accounts";

const table = "account_avatars";

export const createAccountAvatarsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("accountId", "text", (col) => col.primaryKey().references("accounts.id").onDelete("cascade").onUpdate("cascade"))
    .addColumn("image", "blob", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getAccountAvatar = async (db: Database, handle: string): Promise<AccountAvatar | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.accountId`)
    .select([`${table}.accountId as accountId`, `${table}.image as image`, `${table}.createdAt as createdAt`, `${table}.updatedAt as updatedAt`])
    .where(`${accountsTable}.handle`, "=", handle)
    .executeTakeFirst();
};

export const upsertAccountAvatar = async (db: Database, accountId: ID, image: Buffer): Promise<boolean> => {
  const timestamp = nowIso();
  const result = await db
    .insertInto(table)
    .values({ accountId, image, createdAt: timestamp, updatedAt: timestamp })
    .onConflict((oc) => oc.column("accountId").doUpdateSet({ image, updatedAt: timestamp }))
    .executeTakeFirst();
  return Boolean(result.numInsertedOrUpdatedRows);
};

export const deleteAccountAvatar = async (db: Database, accountId: ID): Promise<boolean> => {
  const result = await db.deleteFrom(table).where("accountId", "=", accountId).executeTakeFirst();
  return Boolean(result.numDeletedRows);
};
