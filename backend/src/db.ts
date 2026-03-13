import type { Account, ApiKey, LogSegment, OrganizationMember, Session, UserAuth } from "@underfit/types";
import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { z } from "zod";

import { createAccountsTable } from "repositories/accounts.js";
import { createApiKeysTable } from "repositories/api-keys.js";
import type { ArtifactRow } from "repositories/artifacts.js";
import { createArtifactsTable } from "repositories/artifacts.js";
import { createLogSegmentsTable } from "repositories/logs.js";
import { createOrganizationMembersTable } from "repositories/organization-members.js";
import type { OrganizationRow } from "repositories/organizations.js";
import { createOrganizationsTable } from "repositories/organizations.js";
import { createProjectsTable } from "repositories/projects.js";
import type { ProjectRow } from "repositories/projects.js";
import type { RunRow } from "repositories/runs.js";
import { createRunsTable } from "repositories/runs.js";
import type { ScalarRow } from "repositories/scalars.js";
import { createScalarsTable } from "repositories/scalars.js";
import { createSessionsTable } from "repositories/sessions.js";
import { createUserAuthTable } from "repositories/user-auth.js";
import type { UserRow } from "repositories/users.js";
import { createUsersTable } from "repositories/users.js";

export const DatabaseConfigSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("sqlite"),
    path: z.string().trim().min(1).default(":memory:")
  }),
  z.strictObject({
    type: z.literal("postgresql"),
    hostname: z.string().trim().min(1),
    port: z.coerce.number().int().min(1).max(65535)
  })
]).prefault({ type: "sqlite" });
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;

interface DatabaseSchema {
  accounts: Account;
  users: UserRow;
  api_keys: ApiKey;
  user_auth: UserAuth;
  sessions: Session;
  organizations: OrganizationRow;
  organization_members: OrganizationMember;
  projects: ProjectRow;
  runs: RunRow;
  log_segments: LogSegment;
  artifacts: ArtifactRow;
  scalars: ScalarRow;
}

export type Database = Kysely<DatabaseSchema>;

const initDatabase = async (db: Database): Promise<void> => {
  await createAccountsTable(db);
  await createUsersTable(db);
  await createApiKeysTable(db);
  await createUserAuthTable(db);
  await createSessionsTable(db);
  await createOrganizationsTable(db);
  await createOrganizationMembersTable(db);
  await createProjectsTable(db);
  await createRunsTable(db);
  await createLogSegmentsTable(db);
  await createArtifactsTable(db);
  await createScalarsTable(db);
};

export const createDatabase = async (config: DatabaseConfig): Promise<Database> => {
  if (config.type === "postgresql") {
    throw new Error("PostgreSQL database is not implemented yet.");
  }

  const sqlite = new BetterSqlite3(config.path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: sqlite })
  });

  await initDatabase(db);
  return db;
};
