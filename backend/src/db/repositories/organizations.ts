import type { ID, Organization } from "@overfit/types";

import type { Database } from "db/database.js";

const table = "organizations";

export const createOrganizationsTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("slug", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const listOrganizations = async (db: Database): Promise<Organization[]> => {
  return await db.selectFrom(table).selectAll().execute();
};

export const getOrganization = async (db: Database, id: ID): Promise<Organization | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const upsertOrganization = async (db: Database, organization: Organization): Promise<Organization> => {
  const { id: _, ...updates } = organization;
  await db.insertInto(table).values(organization).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return organization;
};
