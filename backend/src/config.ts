import fs from "node:fs";
import path from "node:path";

import * as toml from "@iarna/toml";

import type { DatabaseConfig } from "db";
import type { LogBufferConfig } from "logbuffer";
import type { StorageConfig } from "storage";

export interface AppConfig {
  server: {
    port: number;
  };
  db: DatabaseConfig;
  storage: StorageConfig;
  logBuffer: LogBufferConfig;
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
  },
  storage: {
    type: "file",
    file: {
      baseDir: "storage"
    }
  },
  logBuffer: {
    maxSegmentBytes: 256 * 1024,
    maxSegmentAgeMs: 30_000,
    flushIntervalMs: 1_000
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
  const storageConfig = isRecord(parsed.storage) ? parsed.storage : {};
  const logBufferConfig = isRecord(parsed.logBuffer) ? parsed.logBuffer : {};
  const sqliteConfig = isRecord(dbConfig.sqlite) ? dbConfig.sqlite : {};
  const fileConfig = isRecord(storageConfig.file) ? storageConfig.file : {};

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

  const storageTypeValue = typeof storageConfig.type === "string" ? storageConfig.type : DEFAULT_CONFIG.storage.type;

  if (storageTypeValue !== "file") {
    throw new Error(`Unsupported storage type: ${storageTypeValue}`);
  }

  const baseDirValue = fileConfig.baseDir ?? DEFAULT_CONFIG.storage.file.baseDir;

  if (typeof baseDirValue !== "string" || baseDirValue.trim() === "") {
    throw new Error("storage.file.baseDir must be a non-empty string");
  }

  const storage: AppConfig["storage"] = {
    type: storageTypeValue,
    file: { baseDir: baseDirValue }
  };

  const maxSegmentBytesValue = logBufferConfig.maxSegmentBytes ?? DEFAULT_CONFIG.logBuffer.maxSegmentBytes;
  const maxSegmentAgeMsValue = logBufferConfig.maxSegmentAgeMs ?? DEFAULT_CONFIG.logBuffer.maxSegmentAgeMs;
  const flushIntervalMsValue = logBufferConfig.flushIntervalMs ?? DEFAULT_CONFIG.logBuffer.flushIntervalMs;
  const values = [
    { key: "logBuffer.maxSegmentBytes", value: maxSegmentBytesValue },
    { key: "logBuffer.maxSegmentAgeMs", value: maxSegmentAgeMsValue },
    { key: "logBuffer.flushIntervalMs", value: flushIntervalMsValue }
  ];

  for (const { key, value } of values) {
    if (typeof value !== "number" && typeof value !== "string") {
      throw new Error(`Invalid ${key} type: ${typeof value}`);
    }
  }

  const maxSegmentBytesRaw = maxSegmentBytesValue as string | number;
  const maxSegmentAgeMsRaw = maxSegmentAgeMsValue as string | number;
  const flushIntervalMsRaw = flushIntervalMsValue as string | number;
  const maxSegmentBytes = Number(maxSegmentBytesValue);
  const maxSegmentAgeMs = Number(maxSegmentAgeMsValue);
  const flushIntervalMs = Number(flushIntervalMsValue);

  if (!Number.isFinite(maxSegmentBytes) || maxSegmentBytes <= 0) {
    throw new Error(`Invalid logBuffer.maxSegmentBytes value: ${String(maxSegmentBytesRaw)}`);
  }
  if (!Number.isFinite(maxSegmentAgeMs) || maxSegmentAgeMs <= 0) {
    throw new Error(`Invalid logBuffer.maxSegmentAgeMs value: ${String(maxSegmentAgeMsRaw)}`);
  }
  if (!Number.isFinite(flushIntervalMs) || flushIntervalMs <= 0) {
    throw new Error(`Invalid logBuffer.flushIntervalMs value: ${String(flushIntervalMsRaw)}`);
  }

  return {
    server: {
      port
    },
    db,
    storage,
    logBuffer: {
      maxSegmentBytes,
      maxSegmentAgeMs,
      flushIntervalMs
    }
  };
};

const parseOverrideValue = (value: string): string | number | boolean | null => {
  if (value === "true") { return true; }
  if (value === "false") { return false; }
  if (value === "null") { return null; }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
};

const applyOverrides = (config: AppConfig, overrides: string[]): AppConfig => {
  const getRecord = (value: unknown, configPath: string): Record<string, unknown> => {
    if (!isRecord(value)) { throw new Error(`Unknown config path: ${configPath}`); }
    return value;
  };

  for (const override of overrides) {
    if (!override.includes("=")) { continue; }
    const [rawKey, ...rest] = override.split("=");
    const keyPath = rawKey.split(".").filter(Boolean);
    if (!rawKey || !keyPath.length) { continue; }
    let cursor: Record<string, unknown> = config as unknown as Record<string, unknown>;
    for (let i = 0; i < keyPath.length - 1; i += 1) {
      cursor = getRecord(cursor[keyPath[i]], rawKey);
    }
    const leaf = keyPath[keyPath.length - 1];
    if (!(leaf in cursor)) { throw new Error(`Unknown config path: ${rawKey}`); }
    cursor[leaf] = parseOverrideValue(rest.join("="));
  }
  return config;
};

export const loadConfig = (configPath?: string, overrides: string[] = []): AppConfig => {
  if (!configPath) {
    const base = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as AppConfig;
    return applyOverrides(base, overrides);
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

  return applyOverrides(parseAppConfig(rawConfig), overrides);
};
