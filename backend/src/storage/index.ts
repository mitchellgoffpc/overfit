import { createSqliteStorage } from "storage/sqlite";
import type { Storage, StorageConfig, StorageType } from "storage/types";

export const createStorage = (config: StorageConfig = {}): Storage => {
  const type: StorageType = config.type ?? "sqlite";

  if (type === "postgresql") {
    throw new Error("PostgreSQL storage is not implemented yet.");
  }

  const sqlitePath = config.sqlite?.path ?? "overfit.db";
  return createSqliteStorage({ path: sqlitePath });
};

export type { Storage, StorageConfig, StorageType } from "storage/types";
