import { createInMemoryStorage } from "storage/memory";
import { createSqliteStorage } from "storage/sqlite";
import type { Storage } from "storage/types";

export type StorageType = "memory" | "sqlite";

export interface StorageConfig {
  type?: StorageType;
  sqlitePath?: string;
}

export const createStorage = (config: StorageConfig = {}): Storage => {
  const configuredType = config.type ?? process.env.OVERFIT_DB;

  if (configuredType !== undefined && configuredType !== "memory" && configuredType !== "sqlite") {
    throw new Error(`Unsupported storage type: ${configuredType}`);
  }

  const type: StorageType = configuredType ?? "sqlite";

  if (type === "memory") {
    return createInMemoryStorage();
  }

  const sqlitePath = config.sqlitePath ?? process.env.OVERFIT_SQLITE_PATH ?? "overfit.db";
  return createSqliteStorage({ path: sqlitePath });
};

export type { Storage } from "storage/types";
