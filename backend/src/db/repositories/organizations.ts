import type { ID, Organization } from "@overfit/types";

import type { Database } from "db";
import { table as accountsTable } from "db/repositories/accounts";

export type OrganizationsTable = Omit<Organization, "handle" | "displayName" | "type">;

export const table = "organizations";

export const createOrganizationsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const listOrganizations = async (db: Database): Promise<Organization[]> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select([
      `${table}.id as id`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.displayName as displayName`,
      `${accountsTable}.type as type`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .execute();
};

export const getOrganization = async (db: Database, id: ID): Promise<Organization | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select([
      `${table}.id as id`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.displayName as displayName`,
      `${accountsTable}.type as type`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
};

export const upsertOrganization = async (db: Database, organization: Organization): Promise<Organization> => {
  const { type: _type, handle, displayName, ...organizationRow } = organization;
  await db
    .insertInto(accountsTable)
    .values({ id: organization.id, handle, displayName, type: "ORGANIZATION" })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, displayName, type: "ORGANIZATION" }))
    .execute();

  const { id: _id, ...updates } = organizationRow;
  await db.insertInto(table).values(organizationRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return organization;
};
