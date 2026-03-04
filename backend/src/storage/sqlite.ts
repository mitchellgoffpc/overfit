import type { Artifact, Metric, Project, Run, Team, User } from "@app/shared/models";
import Database from "better-sqlite3";

import type { EntityStore, Storage } from "storage/types";

type SqliteRow = Record<string, string | number | null>;

interface SqliteConfig {
  path: string;
}

interface SqliteEntityConfig<T> {
  table: string;
  columns: string[];
  toRow: (entity: T) => Record<string, unknown>;
  fromRow: (row: SqliteRow) => T;
}

const serializeJson = (value: Record<string, unknown> | undefined) => (value ? JSON.stringify(value) : null);

const parseJson = (value: unknown) => (typeof value === "string" ? (JSON.parse(value) as Record<string, unknown>) : undefined);

const createEntityStore = <T>(db: Database.Database, config: SqliteEntityConfig<T>): EntityStore<T> => {
  const columns = config.columns.join(", ");
  const parameters = config.columns.map((column) => `@${column}`).join(", ");
  const updates = config.columns.filter((column) => column !== "id").map((column) => `${column} = excluded.${column}`).join(", ");

  const selectAll = db.prepare(`SELECT * FROM ${config.table}`);
  const selectById = db.prepare(`SELECT * FROM ${config.table} WHERE id = ?`);
  const hasById = db.prepare(`SELECT 1 FROM ${config.table} WHERE id = ?`);
  const upsert = db.prepare(`INSERT INTO ${config.table} (${columns}) VALUES (${parameters}) ON CONFLICT(id) DO UPDATE SET ${updates}`);

  return {
    list: () => selectAll.all().map((row) => config.fromRow(row as SqliteRow)),
    get: (id) => {
      const row = selectById.get(id) as SqliteRow | undefined;
      return row ? config.fromRow(row) : undefined;
    },
    has: (id) => Boolean(hasById.get(id)),
    upsert: (entity) => {
      upsert.run(config.toRow(entity));
      return entity;
    }
  };
};

const ensureSchema = (db: Database.Database) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      displayName TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      startedAt TEXT,
      finishedAt TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      runId TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      version TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      uri TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      runId TEXT NOT NULL,
      name TEXT NOT NULL,
      value REAL NOT NULL,
      step INTEGER,
      timestamp TEXT NOT NULL
    );
  `);
};

export const createSqliteStorage = ({ path }: SqliteConfig): Storage => {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);

  return {
    users: createEntityStore<User>(db, {
      table: "users",
      columns: ["id", "email", "displayName", "createdAt", "updatedAt"],
      toRow: (user) => user,
      fromRow: (row) => ({
        id: String(row.id),
        email: String(row.email),
        displayName: String(row.displayName),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt)
      })
    }),
    teams: createEntityStore<Team>(db, {
      table: "teams",
      columns: ["id", "name", "slug", "createdAt", "updatedAt"],
      toRow: (team) => team,
      fromRow: (row) => ({
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt)
      })
    }),
    projects: createEntityStore<Project>(db, {
      table: "projects",
      columns: ["id", "name", "description", "createdAt", "updatedAt"],
      toRow: (project) => ({
        ...project,
        description: project.description ?? null
      }),
      fromRow: (row) => ({
        id: String(row.id),
        name: String(row.name),
        description: row.description === null || row.description === undefined ? undefined : String(row.description),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt)
      })
    }),
    runs: createEntityStore<Run>(db, {
      table: "runs",
      columns: [
        "id",
        "projectId",
        "name",
        "status",
        "createdAt",
        "updatedAt",
        "startedAt",
        "finishedAt",
        "metadata"
      ],
      toRow: (run) => ({
        ...run,
        startedAt: run.startedAt ?? null,
        finishedAt: run.finishedAt ?? null,
        metadata: serializeJson(run.metadata)
      }),
      fromRow: (row) => ({
        id: String(row.id),
        projectId: String(row.projectId),
        name: String(row.name),
        status: row.status as Run["status"],
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
        startedAt: row.startedAt === null || row.startedAt === undefined ? undefined : String(row.startedAt),
        finishedAt: row.finishedAt === null || row.finishedAt === undefined ? undefined : String(row.finishedAt),
        metadata: parseJson(row.metadata)
      })
    }),
    artifacts: createEntityStore<Artifact>(db, {
      table: "artifacts",
      columns: [
        "id",
        "runId",
        "name",
        "type",
        "version",
        "createdAt",
        "updatedAt",
        "uri",
        "metadata"
      ],
      toRow: (artifact) => ({
        ...artifact,
        uri: artifact.uri ?? null,
        metadata: serializeJson(artifact.metadata)
      }),
      fromRow: (row) => ({
        id: String(row.id),
        runId: String(row.runId),
        name: String(row.name),
        type: String(row.type),
        version: String(row.version),
        createdAt: String(row.createdAt),
        updatedAt: String(row.updatedAt),
        uri: row.uri === null || row.uri === undefined ? undefined : String(row.uri),
        metadata: parseJson(row.metadata)
      })
    }),
    metrics: createEntityStore<Metric>(db, {
      table: "metrics",
      columns: ["id", "runId", "name", "value", "step", "timestamp"],
      toRow: (metric) => ({
        ...metric,
        step: metric.step ?? null
      }),
      fromRow: (row) => ({
        id: String(row.id),
        runId: String(row.runId),
        name: String(row.name),
        value: Number(row.value),
        step: row.step === null || row.step === undefined ? undefined : Number(row.step),
        timestamp: String(row.timestamp)
      })
    }),
    close: () => {
      db.close();
    }
  };
};
