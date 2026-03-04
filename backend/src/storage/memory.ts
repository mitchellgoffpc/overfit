import type { Artifact, ID, Metric, Project, Run, Team, User } from "@app/shared/models";

import type { EntityStore, Storage } from "storage/types";

const createMapStore = <T extends { id: ID }>(map = new Map<ID, T>()): EntityStore<T> => ({
  list: () => Array.from(map.values()),
  get: (id) => map.get(id),
  has: (id) => map.has(id),
  upsert: (entity) => {
    map.set(entity.id, entity);
    return entity;
  }
});

export const createInMemoryStorage = (): Storage => ({
  users: createMapStore<User>(),
  teams: createMapStore<Team>(),
  projects: createMapStore<Project>(),
  runs: createMapStore<Run>(),
  artifacts: createMapStore<Artifact>(),
  metrics: createMapStore<Metric>(),
  close: () => undefined
});
