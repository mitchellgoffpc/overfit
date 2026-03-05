import type { ID, Organization } from "@overfit/types";

import type { Database } from "db/database.js";

export type OrganizationsTable = Omit<Organization, "handle" | "displayName">;

const table = "organizations";
const accountsTable = "accounts";

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
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
};

export const upsertOrganization = async (db: Database, organization: Organization): Promise<Organization> => {
  const { handle, displayName, ...organizationRow } = organization;
  await db
    .insertInto(accountsTable)
    .values({ id: organization.id, handle, displayName })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, displayName }))
    .execute();

  const { id: _, ...updates } = organizationRow;
  await db.insertInto(table).values(organizationRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return organization;
};
