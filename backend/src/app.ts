import { API_VERSION } from "@app/shared";
import cors from "cors";
import express from "express";
import type { Express, Request, Response } from "express";

import { registerArtifactRoutes } from "./routes/artifacts";
import { registerMetricRoutes } from "./routes/metrics";
import { registerProjectRoutes } from "./routes/projects";
import { registerRunRoutes } from "./routes/runs";
import { registerTeamRoutes } from "./routes/teams";
import { registerUserRoutes } from "./routes/users";
import { createStorage } from "./storage";
import type { Storage, StorageConfig } from "./storage";

interface AppOptions {
  storage?: Storage;
  storageConfig?: StorageConfig;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  const storage = options.storage ?? createStorage(options.storageConfig);

  app.use(cors());
  app.use(express.json());

  const apiBase = `/api/${API_VERSION}`;

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });

  registerUserRoutes(app, apiBase, storage.users);
  registerTeamRoutes(app, apiBase, storage.teams);
  registerProjectRoutes(app, apiBase, storage.projects);
  registerRunRoutes(app, apiBase, storage.runs);
  registerArtifactRoutes(app, apiBase, storage.artifacts, storage.runs);
  registerMetricRoutes(app, apiBase, storage.metrics, storage.runs);

  return app;
}
