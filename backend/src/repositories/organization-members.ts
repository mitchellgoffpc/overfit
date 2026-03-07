import type { ID, Organization, OrganizationMember, OrganizationRole, User } from "@overfit/types";

import type { Database } from "db";
import { table as accountsTable } from "repositories/accounts";
import { table as organizationsTable } from "repositories/organizations";
import { table as usersTable } from "repositories/users";

const table = "organization_members";

export const createOrganizationMembersTable = async (db: Database): Promise<void> => {
  await db.schema
    .createTable(table)
    .ifNotExists()
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("organizationId", "text", (col) => col.references("organizations.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("userId", "text", (col) => col.references("users.id").onDelete("cascade").onUpdate("cascade").notNull())
    .addColumn("role", "text", (col) => col.notNull())
    .addColumn("createdAt", "text", (col) => col.notNull())
    .addColumn("updatedAt", "text", (col) => col.notNull())
    .execute();
};

export const getOrganizationMember = async (db: Database, id: ID): Promise<OrganizationMember | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", id).executeTakeFirst();
};

export const hasOrganizationMember = async (db: Database, id: ID): Promise<boolean> => {
  return Boolean(await db.selectFrom(table).select("id").where("id", "=", id).executeTakeFirst());
};

export const upsertOrganizationMember = async (db: Database, member: OrganizationMember): Promise<OrganizationMember> => {
  const { id: _, ...updates } = member;
  await db.insertInto(table).values(member).onConflict((oc) => oc.column("id").doUpdateSet(updates)).execute();
  return member;
};

export const deleteOrganizationMember = async (db: Database, id: ID): Promise<void> => {
  await db.deleteFrom(table).where("id", "=", id).execute();
};

export const listOrganizationUsersByOrganizationId = async (
  db: Database,
  organizationId: ID
): Promise<(User & { role: OrganizationRole })[]> => {
  return await db
    .selectFrom(table)
    .innerJoin(usersTable, `${usersTable}.id`, `${table}.userId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${usersTable}.id`)
    .select([
      `${usersTable}.id as id`,
      `${usersTable}.email as email`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.displayName as displayName`,
      `${accountsTable}.type as type`,
      `${usersTable}.createdAt as createdAt`,
      `${usersTable}.updatedAt as updatedAt`,
      `${table}.role as role`
    ])
    .where(`${table}.organizationId`, "=", organizationId)
    .execute();
};

export const listOrganizationMembershipsByUserId = async (
  db: Database,
  userId: ID
): Promise<(Organization & { role: OrganizationRole })[]> => {
  return await db
    .selectFrom(table)
    .innerJoin(organizationsTable, `${organizationsTable}.id`, `${table}.organizationId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${organizationsTable}.id`)
    .select([
      `${organizationsTable}.id as id`,
      `${accountsTable}.handle as handle`,
      `${accountsTable}.displayName as displayName`,
      `${accountsTable}.type as type`,
      `${organizationsTable}.createdAt as createdAt`,
      `${organizationsTable}.updatedAt as updatedAt`,
      `${table}.role as role`
    ])
    .where(`${table}.userId`, "=", userId)
    .execute();
};
