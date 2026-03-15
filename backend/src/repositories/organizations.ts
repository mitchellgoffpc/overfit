import { randomBytes } from "crypto";

import type { Organization } from "@underfit/types";
import { sql } from "kysely";

import type { Database } from "db";
import { nowIso } from "helpers";

export type OrganizationRow = Omit<Organization, "handle" | "type">;
type OrganizationInput = Omit<Organization, "createdAt" | "updatedAt" | "id" | "type">;

export const table = "organizations";
const accountsTable = "accounts"; // avoid circular imports

export const selectOrganizationColumns = [
  `${table}.id as id`,
  `${accountsTable}.handle as handle`,
  `${table}.name as name`,
  sql<"ORGANIZATION">`'ORGANIZATION'`.as("type"),
  `${table}.createdAt as createdAt`,
  `${table}.updatedAt as updatedAt`
] as const;

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
    .select(selectOrganizationColumns)
    .where(`${accountsTable}.handle`, "=", handle)
    .executeTakeFirst();
};

export const createOrganization = async (db: Database, organization: OrganizationInput): Promise<Organization | undefined> => {
  const id = randomBytes(16).toString("hex");
  const createdAt = nowIso();
  try {
    return await db.transaction().execute(async (tx) => {
      const accountResult = await tx
        .insertInto(accountsTable)
        .values({ id, type: "ORGANIZATION", handle: organization.handle })
        .onConflict((oc) => oc.column("handle").doNothing())
        .executeTakeFirst();
      const organizationResult = await tx
        .insertInto(table)
        .values({ id, name: organization.name, createdAt, updatedAt: createdAt })
        .onConflict((oc) => oc.column("id").doNothing())
        .executeTakeFirst();
      if (!accountResult.numInsertedOrUpdatedRows || !organizationResult.numInsertedOrUpdatedRows) { throw new Error(); }
      return { ...organization, id, type: "ORGANIZATION", createdAt, updatedAt: createdAt };
    });
  } catch {
    return undefined;
  }
};

export const updateOrganization = async (
  db: Database, id: string, organization: Partial<Omit<OrganizationInput, "handle">>
): Promise<Organization | undefined> => {
  const updatedAt = nowIso();
  const result = await db.updateTable(table).set({ ...organization, updatedAt }).where("id", "=", id).executeTakeFirst();
  if (!result.numUpdatedRows) {
    return undefined;
  }

  const row = await db
    .selectFrom(table)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${table}.id`)
    .select(`${accountsTable}.handle as handle`)
    .where(`${table}.id`, "=", id)
    .executeTakeFirst();
  return row ? await getOrganization(db, row.handle) : undefined;
};
