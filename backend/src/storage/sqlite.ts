import type { Artifact, Metric, Organization, OrganizationMember, Project, Run, Session, User, UserAuth } from "@overfit/types";
import Database from "better-sqlite3";

import { schema } from "storage/types";
import type { ColumnDef, ColumnKind, EntityStore, SchemaDef, SqliteConfig, Storage, TableDef } from "storage/types";

export type SqliteRow = Record<string, string | number | null>;

const columnTypeByKind: Record<ColumnKind, string> = {
  string: "TEXT",
  integer: "INTEGER",
  real: "REAL",
  json: "TEXT",
  blob: "BLOB"
};

const formatDefaultValue = (value: string | number | boolean | null) => {
  if (value === null) {
    return "NULL";
  } else if (typeof value === "string") {
    return "'" + value.replace(/'/g, "''") + "'";
  } else if (typeof value === "boolean") {
    return value ? "1" : "0";
  } else {
    return String(value);
  }
};

const buildColumnSql = (name: string, def: ColumnDef) => {
  const parts = [`${name} ${columnTypeByKind[def.kind]}`];
  if (!def.optional) { parts.push("NOT NULL"); }
  if (def.unique) { parts.push("UNIQUE"); }
  if (def.primaryKey) { parts.push("PRIMARY KEY"); }
  if (def.default !== undefined) { parts.push(`DEFAULT ${formatDefaultValue(def.default)}`); }
  if (def.references) {
    const refs = def.references;
    const clauses = [`REFERENCES ${refs.table}(${refs.column})`];
    if (refs.onDelete) { clauses.push(`ON DELETE ${refs.onDelete}`); }
    if (refs.onUpdate) { clauses.push(`ON UPDATE ${refs.onUpdate}`); }
    parts.push(clauses.join(" "));
  }
  return parts.join(" ");
};

const buildCreateTableSql = (tableName: string, table: TableDef) => {
  const columnSql = Object.entries(table.columns).map(([columnName, def]) => buildColumnSql(columnName, def));
  return `CREATE TABLE IF NOT EXISTS ${tableName} (${columnSql.join(", ")});`;
};

const buildSchemaSql = (definition: SchemaDef) => Object.entries(definition).map(([name, table]) => buildCreateTableSql(name, table)).join("\n");

const createEntityStore = <T>(db: Database.Database, tableName: keyof typeof schema): EntityStore<T> => {
  const table = schema[tableName];
  const columnNames = Object.keys(table.columns);
  const columns = columnNames.join(", ");
  const parameters = columnNames.map((column) => `@${column}`).join(", ");
  const updates = columnNames.filter((column) => column !== "id").map((column) => `${column} = excluded.${column}`).join(", ");

  const toRow = (entity: T) => {
    const row: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(table.columns)) {
      const value = (entity as Record<string, unknown>)[key];
      if (def.kind === "json") {
        row[key] = value ? JSON.stringify(value) : null;
      } else if (def.optional && value === undefined) {
        row[key] = null;
      } else {
        row[key] = value;
      }
    }
    return row;
  };

  const fromRow = (row: SqliteRow) => {
    const entity: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(table.columns)) {
      const value = row[key];
      if (value === null) {
        entity[key] = def.optional ? undefined : value;
      } else if (def.kind === "string") {
        entity[key] = String(value);
      } else if (def.kind === "integer" || def.kind === "real") {
        entity[key] = Number(value);
      } else if (def.kind === "blob") {
        entity[key] = value;
      } else {
        entity[key] = (typeof value === "string" ? (JSON.parse(value) as Record<string, unknown>) : undefined);
      }
    }
    return entity as T;
  };

  const selectAll = db.prepare(`SELECT * FROM ${tableName}`);
  const selectById = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
  const hasById = db.prepare(`SELECT 1 FROM ${tableName} WHERE id = ?`);
  const deleteById = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
  const upsert = db.prepare(
    `INSERT INTO ${tableName} (${columns}) VALUES (${parameters}) ON CONFLICT(id) DO UPDATE SET ${updates}`
  );

  return {
    list: () => selectAll.all().map((row) => fromRow(row as SqliteRow)),
    get: (id) => {
      const row = selectById.get(id) as SqliteRow | undefined;
      return row ? fromRow(row) : undefined;
    },
    has: (id) => Boolean(hasById.get(id)),
    delete: (id) => {
      deleteById.run(id);
    },
    upsert: (entity) => {
      upsert.run(toRow(entity));
      return entity;
    }
  };
};

export const createSqliteStorage = ({ path }: SqliteConfig): Storage => {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(buildSchemaSql(schema));

  return {
    users: createEntityStore<User>(db, "users"),
    userAuth: createEntityStore<UserAuth>(db, "user_auth"),
    sessions: createEntityStore<Session>(db, "sessions"),
    organizations: createEntityStore<Organization>(db, "organizations"),
    organizationMembers: createEntityStore<OrganizationMember>(db, "organization_members"),
    projects: createEntityStore<Project>(db, "projects"),
    runs: createEntityStore<Run>(db, "runs"),
    artifacts: createEntityStore<Artifact>(db, "artifacts"),
    metrics: createEntityStore<Metric>(db, "metrics"),
    close: () => {
      db.close();
    }
  };
};
