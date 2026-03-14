import { randomBytes } from "crypto";

import type { Organization } from "@underfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { nowIso } from "repositories/helpers";

export type OrganizationRow = Omit<Organization, "handle" | "name" | "type">;
type OrganizationInput = Omit<Organization, "createdAt" | "updatedAt" | "id" | "type">;

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

export const createOrganization = async (db: Database, organization: OrganizationInput): Promise<Organization> => {
  const id = randomBytes(16).toString("hex");
  const createdAt = nowIso();
  await db.insertInto(accountsTable).values({ id, type: "ORGANIZATION", ...organization }).execute();
  await db.insertInto(table).values({ id, createdAt, updatedAt: createdAt }).execute();
  return await getOrganization(db, organization.handle) ?? { id, type: "ORGANIZATION", createdAt, updatedAt: createdAt, ...organization };
};

export const updateOrganization = async (db: Database, id: string, organization: Partial<OrganizationInput>): Promise<Organization> => {
  const updatedAt = nowIso();
  await db.updateTable(accountsTable).set(organization).where("id", "=", id).execute();
  await db.updateTable(table).set({ updatedAt }).where("id", "=", id).execute();
  return await getOrganization(db, organization.handle) ?? { id, type: "ORGANIZATION", createdAt: updatedAt, updatedAt, ...organization };
};
