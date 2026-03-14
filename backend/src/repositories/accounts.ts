import type { AccountType, ID, Organization, User } from "@underfit/types";

import type { Database } from "db";
import { selectOrganizationColumns, table as organizationsTable } from "repositories/organizations";
import { selectUserColumns, table as usersTable } from "repositories/users";

export const table = "accounts";

export interface AccountRow { id: ID; handle: string; type: AccountType };

export const createAccountsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("handle", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull().defaultTo("USER"))
    .addUniqueConstraint("accounts_handle_unique", ["handle"])
    .execute();
};

const hydrateAccount = async (db: Database, account: { id: ID; type: AccountType }): Promise<User | Organization | undefined> => {
  if (account.type === "USER") {
    return await db
      .selectFrom(usersTable)
      .innerJoin(table, `${table}.id`, `${usersTable}.id`)
      .select(selectUserColumns)
      .where(`${table}.id`, "=", account.id)
      .executeTakeFirst();
  } else {
    return await db
      .selectFrom(organizationsTable)
      .innerJoin(table, `${table}.id`, `${organizationsTable}.id`)
      .select(selectOrganizationColumns)
      .where(`${table}.id`, "=", account.id)
      .executeTakeFirst();
  }
};

export const getAccount = async (db: Database, handle: string): Promise<User | Organization | undefined> => {
  const query = db.selectFrom(table).select([`${table}.id as id`, `${table}.type as type`]);
  const account = await query.where(`${table}.handle`, "=", handle).executeTakeFirst();
  return account ? await hydrateAccount(db, account) : undefined;
};
