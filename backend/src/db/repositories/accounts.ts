import type { Account, ID } from "@overfit/types";
import { sql } from "kysely";

import type { Database } from "db";

const table = "accounts";

export const createAccountsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("handle", "text", (col) => col.notNull())
    .addColumn("displayName", "text", (col) => col.notNull())
    .execute();
};

export const getAccount = async (db: Database, id: ID): Promise<Account | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const upsertAccount = async (db: Database, account: Account): Promise<Account> => {
  const { id: _, ...updates } = account;
  await db.insertInto(table).values(account).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return account;
};

export const handleExists = async (db: Database, handle: string): Promise<boolean> => {
  const row = await db.selectFrom(table).select("id").where(sql`lower(handle)`, "=", handle.toLowerCase()).executeTakeFirst();
  return Boolean(row);
};
