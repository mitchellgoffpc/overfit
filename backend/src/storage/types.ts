import type { Artifact, ID, Metric, Project, Run, Team, User } from "@overfit/types";

export type StorageType = "sqlite" | "postgresql";

export interface StorageConfig {
  type?: StorageType;
  sqlite?: {
    path?: string;
  };
}

export interface EntityStore<T> {
  list: () => T[];
  get: (id: ID) => T | undefined;
  has: (id: ID) => boolean;
  upsert: (entity: T) => T;
}

export interface Storage {
  users: EntityStore<User>;
  teams: EntityStore<Team>;
  projects: EntityStore<Project>;
  runs: EntityStore<Run>;
  artifacts: EntityStore<Artifact>;
  metrics: EntityStore<Metric>;
  close: () => void;
}
