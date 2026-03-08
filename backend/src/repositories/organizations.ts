import type { ID, Organization } from "@underfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export type OrganizationRow = Omit<Organization, "handle" | "displayName" | "type">;

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

export const upsertOrganization = async (db: Database, organization: Omit<Organization, "createdAt" | "updatedAt">): Promise<Organization> => {
  const payload: Organization = { ...organization, createdAt: nowIso(), updatedAt: nowIso() };
  const { type: _type, handle, displayName, ...organizationRow } = payload;
  await db
    .insertInto(accountsTable)
    .values({ id: organization.id, handle, displayName, type: "ORGANIZATION" })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, displayName, type: "ORGANIZATION" }))
    .execute();

  const { id: _id, createdAt: __, ...updates } = organizationRow;
  await db.insertInto(table).values(organizationRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return await getOrganization(db, organization.id) ?? payload;
};
