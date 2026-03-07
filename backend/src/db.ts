import type { Account, Metric, OrganizationMember, Project, Session, UserAuth } from "@underfit/types";
import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";

import { createAccountsTable } from "repositories/accounts.js";
import type { ArtifactsTable } from "repositories/artifacts.js";
import { createArtifactsTable } from "repositories/artifacts.js";
import { createMetricsTable } from "repositories/metrics.js";
import { createOrganizationMembersTable } from "repositories/organization-members.js";
import type { OrganizationsTable } from "repositories/organizations.js";
import { createOrganizationsTable } from "repositories/organizations.js";
import { createProjectsTable } from "repositories/projects.js";
import type { RunsTable } from "repositories/runs.js";
import { createRunsTable } from "repositories/runs.js";
import { createSessionsTable } from "repositories/sessions.js";
import { createUserAuthTable } from "repositories/user-auth.js";
import type { UsersTable } from "repositories/users.js";
import { createUsersTable } from "repositories/users.js";

export type DatabaseType = "sqlite" | "postgresql";

export interface SqliteConfig {
  path: string;
}

export interface DatabaseConfig {
  type?: DatabaseType;
  sqlite?: SqliteConfig;
}

export interface DatabaseSchema {
  accounts: Account;
  users: UsersTable;
  user_auth: UserAuth;
  sessions: Session;
  organizations: OrganizationsTable;
  organization_members: OrganizationMember;
  projects: Project;
  runs: RunsTable;
  artifacts: ArtifactsTable;
  metrics: Metric;
}

export type Database = Kysely<DatabaseSchema>;

const initDatabase = async (db: Database): Promise<void> => {
  await createAccountsTable(db);
  await createUsersTable(db);
  await createUserAuthTable(db);
  await createSessionsTable(db);
  await createOrganizationsTable(db);
  await createOrganizationMembersTable(db);
  await createProjectsTable(db);
  await createRunsTable(db);
  await createArtifactsTable(db);
  await createMetricsTable(db);
};

export const createDatabase = async (config: DatabaseConfig = {}): Promise<Database> => {
  const type: DatabaseType = config.type ?? "sqlite";

  if (type === "postgresql") {
    throw new Error("PostgreSQL database is not implemented yet.");
  }

  const sqlitePath = config.sqlite?.path ?? "underfit.db";
  const sqlite = new BetterSqlite3(sqlitePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  const db = new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: sqlite })
  });

  await initDatabase(db);
  return db;
};
