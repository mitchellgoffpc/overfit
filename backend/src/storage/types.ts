import type { Artifact, ID, Metric, Organization, OrganizationMember, Project, Run, Session, User, UserAuth } from "@overfit/types";

export type StorageType = "sqlite" | "postgresql";

export interface SqliteConfig {
  path: string;
}

export interface StorageConfig {
  type?: StorageType;
  sqlite?: SqliteConfig;
}

export interface EntityStore<T> {
  list: () => T[];
  get: (id: ID) => T | undefined;
  has: (id: ID) => boolean;
  upsert: (entity: T) => T;
  delete: (id: ID) => void;
}

export interface Storage {
  users: EntityStore<User>;
  userAuth: EntityStore<UserAuth>;
  sessions: EntityStore<Session>;
  organizations: EntityStore<Organization>;
  organizationMembers: EntityStore<OrganizationMember>;
  projects: EntityStore<Project>;
  runs: EntityStore<Run>;
  artifacts: EntityStore<Artifact>;
  metrics: EntityStore<Metric>;
  close: () => void;
}

export type CascadeAction = "CASCADE" | "RESTRICT" | "SET NULL" | "NO ACTION";
export type ColumnKind = "string" | "integer" | "real" | "json" | "blob";

export interface ForeignKey {
  table: string;
  column: string;
  onDelete?: CascadeAction;
  onUpdate?: CascadeAction;
}

export interface ColumnDef {
  kind: ColumnKind;
  optional?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  default?: string | number | boolean | null;
  references?: ForeignKey;
}

export interface TableDef {
  columns: Record<string, ColumnDef>;
}

export type SchemaDef = Record<string, TableDef>;

export const schema: SchemaDef = {
  users: {
    columns: {
      id: { kind: "string", primaryKey: true },
      email: { kind: "string" },
      displayName: { kind: "string" },
      createdAt: { kind: "string" },
      updatedAt: { kind: "string" }
    }
  },
  user_auth: {
    columns: {
      id: {
        kind: "string",
        primaryKey: true,
        references: { table: "users", column: "id", onDelete: "CASCADE", onUpdate: "CASCADE" }
      },
      passwordHash: { kind: "string" },
      passwordSalt: { kind: "string" },
      passwordIterations: { kind: "integer" },
      passwordDigest: { kind: "string" },
      createdAt: { kind: "string" },
      updatedAt: { kind: "string" }
    }
  },
  sessions: {
    columns: {
      id: { kind: "string", primaryKey: true },
      userId: {
        kind: "string",
        references: { table: "users", column: "id", onDelete: "CASCADE", onUpdate: "CASCADE" }
      },
      createdAt: { kind: "string" },
      expiresAt: { kind: "string" }
    }
  },
  organizations: {
    columns: {
      id: { kind: "string", primaryKey: true },
      name: { kind: "string" },
      slug: { kind: "string" },
      createdAt: { kind: "string" },
      updatedAt: { kind: "string" }
    }
  },
  organization_members: {
    columns: {
      id: { kind: "string", primaryKey: true },
      organizationId: {
        kind: "string",
        references: { table: "organizations", column: "id", onDelete: "CASCADE", onUpdate: "CASCADE" }
      },
      userId: {
        kind: "string",
        references: { table: "users", column: "id", onDelete: "CASCADE", onUpdate: "CASCADE" }
      },
      role: { kind: "string" },
      createdAt: { kind: "string" },
      updatedAt: { kind: "string" }
    }
  },
  projects: {
    columns: {
      id: { kind: "string", primaryKey: true },
      name: { kind: "string" },
      description: { kind: "string", optional: true },
      createdAt: { kind: "string" },
      updatedAt: { kind: "string" }
    }
  },
  runs: {
    columns: {
      id: { kind: "string", primaryKey: true },
      projectId: {
        kind: "string",
        references: { table: "projects", column: "id", onDelete: "CASCADE", onUpdate: "CASCADE" }
      },
      name: { kind: "string" },
      status: { kind: "string" },
      createdAt: { kind: "string" },
      updatedAt: { kind: "string" },
      startedAt: { kind: "string", optional: true },
      finishedAt: { kind: "string", optional: true },
      metadata: { kind: "json", optional: true }
    }
  },
  artifacts: {
    columns: {
      id: { kind: "string", primaryKey: true },
      runId: {
        kind: "string",
        references: { table: "runs", column: "id", onDelete: "CASCADE", onUpdate: "CASCADE" }
      },
      name: { kind: "string" },
      type: { kind: "string" },
      version: { kind: "string" },
      createdAt: { kind: "string" },
      updatedAt: { kind: "string" },
      uri: { kind: "string", optional: true },
      metadata: { kind: "json", optional: true }
    }
  },
  metrics: {
    columns: {
      id: { kind: "string", primaryKey: true },
      runId: {
        kind: "string",
        references: { table: "runs", column: "id", onDelete: "CASCADE", onUpdate: "CASCADE" }
      },
      name: { kind: "string" },
      value: { kind: "real" },
      step: { kind: "integer", optional: true },
      timestamp: { kind: "string" }
    }
  }
};
