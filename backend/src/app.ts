import { API_VERSION } from "@overfit/types";
import cors from "cors";
import express from "express";
import type { Express, Request, Response } from "express";

import type { AppConfig } from "config";
import { createDatabase } from "db";
import { registerArtifactRoutes } from "routes/artifacts";
import { registerAuthRoutes } from "routes/auth";
import { registerMetricRoutes } from "routes/metrics";
import { registerOrganizationRoutes } from "routes/organizations";
import { registerProjectRoutes } from "routes/projects";
import { registerRunRoutes } from "routes/runs";
import { registerUserRoutes } from "routes/users";

export async function createApp(config: AppConfig): Promise<Express> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const apiBase = `/api/${API_VERSION}`;
  const db = await createDatabase(config.db);

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });

  registerAuthRoutes(app, apiBase, db);
  registerUserRoutes(app, apiBase, db);
  registerOrganizationRoutes(app, apiBase, db);
  registerProjectRoutes(app, apiBase, db);
  registerRunRoutes(app, apiBase, db);
  registerArtifactRoutes(app, apiBase, db);
  registerMetricRoutes(app, apiBase, db);

  return app;
}
