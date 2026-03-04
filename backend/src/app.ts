import { API_VERSION } from "@app/shared/models";
import cors from "cors";
import express from "express";
import type { Express, Request, Response } from "express";

import type { AppConfig } from "config";
import { registerArtifactRoutes } from "routes/artifacts";
import { registerMetricRoutes } from "routes/metrics";
import { registerProjectRoutes } from "routes/projects";
import { registerRunRoutes } from "routes/runs";
import { registerTeamRoutes } from "routes/teams";
import { registerUserRoutes } from "routes/users";
import { createStorage } from "storage";

export function createApp(config: AppConfig): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const apiBase = `/api/${API_VERSION}`;
  const storage = createStorage(config.storage);

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
