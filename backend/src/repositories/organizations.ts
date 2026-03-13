import type { Organization } from "@underfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export type OrganizationRow = Omit<Organization, "handle" | "name" | "type">;

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

export const getOrganization = async (db: Database, handle: string): Promise<Organization | undefined> => {
  return await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select([
      `${table}.id as id`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.name as name`,
      `${accountsTable}.type as type`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(`${accountsTable}.handle`, "=", handle)
    .executeTakeFirst();
};

export const upsertOrganization = async (db: Database, organization: Omit<Organization, "createdAt" | "updatedAt">): Promise<Organization> => {
  const payload: Organization = { ...organization, createdAt: nowIso(), updatedAt: nowIso() };
  const { type: _type, handle, name, ...organizationRow } = payload;
  await db
    .insertInto(accountsTable)
    .values({ id: organization.id, handle, name, type: "ORGANIZATION" })
    .onConflict((oc) => oc.column("id").doUpdateSet({ handle, name, type: "ORGANIZATION" }))
    .execute();

  const { id: _id, createdAt: __, ...updates } = organizationRow;
  await db.insertInto(table).values(organizationRow).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return await getOrganization(db, handle) ?? payload;
};
