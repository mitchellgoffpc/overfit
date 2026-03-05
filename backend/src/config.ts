import fs from "node:fs";
import path from "node:path";

import * as toml from "@iarna/toml";

import type { DatabaseConfig } from "db/types";

export interface AppConfig {
  server: {
    port: number;
  };
  db: DatabaseConfig;
}

export const DEFAULT_CONFIG: AppConfig = {
  server: {
    port: 4000
  },
  db: {
    type: "sqlite",
    sqlite: {
      path: ":memory:"
    }
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export const parseAppConfig = (rawConfig: string): AppConfig => {
  const parsed = toml.parse(rawConfig);

  if (!isRecord(parsed)) {
    throw new Error("Config file must contain a top-level table");
  }

  const serverConfig = isRecord(parsed.server) ? parsed.server : {};
  const dbConfig = isRecord(parsed.db) ? parsed.db : {};
  const sqliteConfig = isRecord(dbConfig.sqlite) ? dbConfig.sqlite : {};

  const portValue = serverConfig.port ?? DEFAULT_CONFIG.server.port;

  if (typeof portValue !== "number" && typeof portValue !== "string") {
    throw new Error(`Invalid server.port type: ${typeof portValue}`);
  }

  const port = typeof portValue === "number" ? portValue : Number(portValue);

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid server.port value: ${String(portValue)}`);
  }

  const typeValue = dbConfig.type ?? DEFAULT_CONFIG.db.type;

  if (typeof typeValue !== "string") {
    throw new Error(`Invalid db.type type: ${typeof typeValue}`);
  }

  if (typeValue !== "sqlite" && typeValue !== "postgresql") {
    throw new Error(`Unsupported db type: ${typeValue}`);
  }
  const db: AppConfig["db"] = { type: typeValue };

  if (typeValue === "sqlite") {
    const sqlitePathValue = sqliteConfig.path ?? DEFAULT_CONFIG.db.sqlite.path;

    if (typeof sqlitePathValue !== "string" || sqlitePathValue.trim() === "") {
      throw new Error("db.sqlite.path must be a non-empty string");
    }

    db.sqlite = { path: sqlitePathValue };
  }

  return {
    server: {
      port
    },
    db
  };
};

export const loadConfig = (configPath?: string): AppConfig => {
  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  const resolvedPath = path.resolve(process.cwd(), configPath);
  let rawConfig: string;

  try {
    rawConfig = fs.readFileSync(resolvedPath, "utf-8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Config file not found at ${resolvedPath}`);
    }

    throw error;
  }

  return parseAppConfig(rawConfig);
};
