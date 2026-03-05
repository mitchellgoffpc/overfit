export type DatabaseType = "sqlite" | "postgresql";

export interface SqliteConfig {
  path: string;
}

export interface DatabaseConfig {
  type?: DatabaseType;
  sqlite?: SqliteConfig;
}
