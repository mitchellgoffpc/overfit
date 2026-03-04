import { createInMemoryStorage } from "storage/memory";
import { createSqliteStorage } from "storage/sqlite";
import type { Storage } from "storage/types";

export type StorageType = "memory" | "sqlite";

export interface StorageConfig {
  type?: StorageType;
  sqlite?: {
    path?: string;
  };
}

export const createStorage = (config: StorageConfig = {}): Storage => {
  const type: StorageType = config.type ?? "sqlite";

  if (type === "memory") {
    return createInMemoryStorage();
  }

  const sqlitePath = config.sqlite?.path ?? "overfit.db";
  return createSqliteStorage({ path: sqlitePath });
};

export type { Storage } from "storage/types";
