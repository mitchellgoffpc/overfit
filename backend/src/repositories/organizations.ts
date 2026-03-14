import { randomBytes } from "crypto";

import type { Organization } from "@underfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export type OrganizationRow = Omit<Organization, "handle" | "type">;
type OrganizationInput = Omit<Organization, "createdAt" | "updatedAt" | "id" | "type">;

export const table = "organizations";

export const createOrganizationsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
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
      `${table}.name as name`,
      `${accountsTable}.type as type`,
      `${table}.createdAt as createdAt`,
      `${table}.updatedAt as updatedAt`
    ])
    .where(`${accountsTable}.handle`, "=", handle)
    .executeTakeFirst();
};

export const createOrganization = async (db: Database, organization: OrganizationInput): Promise<Organization> => {
  const id = randomBytes(16).toString("hex");
  const createdAt = nowIso();
  await db.insertInto(accountsTable).values({ id, type: "ORGANIZATION", handle: organization.handle }).execute();
  await db.insertInto(table).values({ id, name: organization.name, createdAt, updatedAt: createdAt }).execute();
  return await getOrganization(db, organization.handle) ?? { id, type: "ORGANIZATION", createdAt, updatedAt: createdAt, ...organization };
};

export const updateOrganization = async (db: Database, id: string, organization: Partial<Omit<OrganizationInput, "handle">>): Promise<Organization> => {
  const updatedAt = nowIso();
  await db.updateTable(table).set({ ...organization, updatedAt }).where("id", "=", id).execute();
  const row = await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select(`${accountsTable}.handle as handle`)
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
  if (!row) { throw new Error(`Organization not found: ${id}`); }
  const output = await getOrganization(db, row.handle);
  if (!output) { throw new Error(`Organization not found: ${id}`); }
  return output;
};
