import type { AccountType, ID, Organization, User } from "@underfit/types";

import type { Database } from "db";
import { table as organizationsTable } from "repositories/organizations";
import { table as usersTable } from "repositories/users";

export const table = "accounts";
const handleUniqueIndex = "accounts_handle_unique";

export const createAccountsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("handle", "text", (col) => col.notNull())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("type", "text", (col) => col.notNull().defaultTo("USER"))
    .addUniqueConstraint(handleUniqueIndex, ["handle"])
    .execute();
};

const hydrateAccount = async (db: Database, account: { id: ID; type: AccountType }): Promise<User | Organization | undefined> => {
  const sourceTable = account.type === "USER" ? usersTable : organizationsTable;
  const columns = [
    `${sourceTable}.id as id`,
    `${table}.handle as handle`,
    `${table}.name as name`,
    `${table}.type as type`,
    `${sourceTable}.createdAt as createdAt`,
    `${sourceTable}.updatedAt as updatedAt`,
    ...(account.type === "USER" ? [`${usersTable}.email as email`] : [])
  ];
  return await db
    .selectFrom(sourceTable)
    .innerJoin(table, `${table}.id`, `${sourceTable}.id`)
    .select(columns)
    .where(`${table}.id`, "=", account.id)
    .executeTakeFirst();
};

export const getAccount = async (db: Database, handle: string): Promise<User | Organization | undefined> => {
  const query = db.selectFrom(table).select([`${table}.id as id`, `${table}.type as type`]);
  const account = await query.where(`${table}.handle`, "=", handle).executeTakeFirst();
  return account ? await hydrateAccount(db, account) : undefined;
};
