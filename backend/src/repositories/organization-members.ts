import type { ID, Organization, OrganizationMember, OrganizationRole, User } from "@underfit/types";

import type { Database } from "db";
import { nowIso } from "helpers";
import { table as accountsTable } from "repositories/accounts";
import { selectOrganizationColumns, table as organizationsTable } from "repositories/organizations";
import { selectUserColumns, table as usersTable } from "repositories/users";

const table = "organization_members";

const getMembershipId = (organizationId: ID, userId: ID): ID => `${organizationId}:${userId}`;

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

export const getOrganizationMember = async (db: Database, organizationId: ID, userId: ID): Promise<OrganizationMember | undefined> => {
  return await db.selectFrom(table).selectAll().where("id", "=", getMembershipId(organizationId, userId)).executeTakeFirst();
};

export const createOrganizationMember = async (db: Database, organizationId: ID, userId: ID, role: OrganizationRole): Promise<OrganizationMember> => {
  const id = getMembershipId(organizationId, userId);
  const payload: OrganizationMember = { id, userId, organizationId, role, createdAt: nowIso(), updatedAt: nowIso() };
  await db.insertInto(table).values(payload).execute();
  return payload;
};

export const deleteOrganizationMember = async (db: Database, organizationId: ID, userId: ID): Promise<boolean> => {
  const result = await db
    .deleteFrom(table)
    .where("id", "=", getMembershipId(organizationId, userId))
    .where((eb) => eb.exists(
      eb.selectFrom(table)
        .select("id")
        .where("organizationId", "=", organizationId)
        .where("role", "=", "ADMIN")
        .where("userId", "!=", userId)
    ))
    .executeTakeFirst();

  return result.numDeletedRows > 0;
};

export const listOrganizationMembers = async (db: Database, organizationId: ID): Promise<(User & { role: OrganizationRole })[]> => {
  return await db
    .selectFrom(table)
    .innerJoin(usersTable, `${usersTable}.id`, `${table}.userId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${usersTable}.id`)
    .select([...selectUserColumns, `${table}.role as role`])
    .where(`${table}.organizationId`, "=", organizationId)
    .execute();
};

export const listUserMemberships = async (db: Database, userId: ID): Promise<(Organization & { role: OrganizationRole })[]> => {
  return await db
    .selectFrom(table)
    .innerJoin(organizationsTable, `${organizationsTable}.id`, `${table}.organizationId`)
    .innerJoin(accountsTable, `${accountsTable}.id`, `${organizationsTable}.id`)
    .select([...selectOrganizationColumns, `${table}.role as role`])
    .where(`${table}.userId`, "=", userId)
    .execute();
};
