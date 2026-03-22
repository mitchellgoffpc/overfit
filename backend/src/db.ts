import type { AccountAvatar, ApiKeyWithToken, Collaborator, LogSegment, OrganizationMember, ScalarSegment, Session, UserAuth } from "@underfit/types";
import BetterSqlite3 from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import { z } from "zod";

import { createAccountAvatarsTable } from "repositories/account-avatars";
import type { AccountRow } from "repositories/accounts";
import { createAccountsTable } from "repositories/accounts";
import { createApiKeysTable } from "repositories/api-keys";
import type { ArtifactRow } from "repositories/artifacts";
import { createArtifactsTable } from "repositories/artifacts";
import { createCollaboratorsTable } from "repositories/collaborators";
import { createLogSegmentsTable } from "repositories/logs";
import type { MediaRow } from "repositories/media";
import { createMediaTable } from "repositories/media";
import { createOrganizationMembersTable } from "repositories/organization-members";
import type { OrganizationRow } from "repositories/organizations";
import { createOrganizationsTable } from "repositories/organizations";
import { createProjectsTable } from "repositories/projects";
import type { ProjectRow } from "repositories/projects";
import type { RunRow } from "repositories/runs";
import { createRunsTable } from "repositories/runs";
import { createScalarSegmentsTable } from "repositories/scalars";
import { createSessionsTable } from "repositories/sessions";
import { createUserAuthTable } from "repositories/user-auth";
import type { UserRow } from "repositories/users";
import { createUsersTable } from "repositories/users";

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
  accounts: AccountRow;
  users: UserRow;
  api_keys: ApiKeyWithToken;
  user_auth: UserAuth;
  account_avatars: AccountAvatar;
  sessions: Session;
  organizations: OrganizationRow;
  organization_members: OrganizationMember;
  projects: ProjectRow;
  collaborators: Collaborator;
  runs: RunRow;
  log_segments: LogSegment;
  artifacts: ArtifactRow;
  media: MediaRow;
  scalar_segments: ScalarSegment;
}

export type Database = Kysely<DatabaseSchema>;

const initDatabase = async (db: Database): Promise<void> => {
  await createAccountsTable(db);
  await createUsersTable(db);
  await createApiKeysTable(db);
  await createUserAuthTable(db);
  await createAccountAvatarsTable(db);
  await createSessionsTable(db);
  await createOrganizationsTable(db);
  await createOrganizationMembersTable(db);
  await createProjectsTable(db);
  await createCollaboratorsTable(db);
  await createRunsTable(db);
  await createLogSegmentsTable(db);
  await createArtifactsTable(db);
  await createMediaTable(db);
  await createScalarSegmentsTable(db);
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
