import type { Account, ID, Organization, User } from "@overfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { table as organizationsTable } from "repositories/organizations";
import { table as usersTable } from "repositories/users";

export const table = "accounts";

export const createAccountsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("handle", "text", (col) => col.notNull())
    .addColumn("displayName", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull().defaultTo("USER"))
    .execute();
};

export const getAccount = async (db: Database, id: ID): Promise<Account | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const getAccountByHandle = async (db: Database, handle: string): Promise<User | Organization | undefined> => {
  const account = await db
    .selectFrom(table)
    .select([`${table}.id as id`, `${table}.type as type`])
    .where(sql`lower(handle)`, "=", handle.toLowerCase())
    .executeTakeFirst();

  if (!account) {
    return undefined;
  } else if (account.type === "USER") {
    return await db
      .selectFrom(usersTable)
      .innerJoin(table, `${table}.id`, `${usersTable}.id`)
      .select([
        `${usersTable}.id as id`,
        `${usersTable}.email as email`,
        `${table}.handle as handle`,
        `${table}.displayName as displayName`,
        `${table}.type as type`,
        `${usersTable}.createdAt as createdAt`,
        `${usersTable}.updatedAt as updatedAt`
      ])
      .where(`${table}.id`, "=", account.id)
      .executeTakeFirst();
  } else {
    return await db
      .selectFrom(organizationsTable)
      .innerJoin(table, `${table}.id`, `${organizationsTable}.id`)
      .select([
        `${organizationsTable}.id as id`,
        `${table}.handle as handle`,
        `${table}.displayName as displayName`,
        `${table}.type as type`,
        `${organizationsTable}.createdAt as createdAt`,
        `${organizationsTable}.updatedAt as updatedAt`
      ])
      .where(`${table}.id`, "=", account.id)
      .executeTakeFirst();
  }
};

export const upsertAccount = async (db: Database, account: Account): Promise<Account> => {
  const { id: _, ...updates } = account;
  await db.insertInto(table).values(account).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return account;
};
