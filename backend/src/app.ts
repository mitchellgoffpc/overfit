import { API_BASE, API_VERSION } from "@underfit/types";
import cors from "cors";
import express from "express";
import type { Express, Request, Response } from "express";

import type { Database } from "db";
import { registerAccountRoutes } from "routes/accounts";
import { registerArtifactRoutes } from "routes/artifacts";
import { registerAuthRoutes } from "routes/auth";
import { registerMetricRoutes } from "routes/metrics";
import { registerOrganizationRoutes } from "routes/organizations";
import { registerProjectRoutes } from "routes/projects";
import { registerRunRoutes } from "routes/runs";
import { registerUserRoutes } from "routes/users";
import type { StorageBackend } from "storage";

export function createApp(db: Database, storage: StorageBackend | null = null): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get(`${API_BASE}/health`, (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });

  registerAuthRoutes(app, db);
  registerAccountRoutes(app, db);
  registerUserRoutes(app, db);
  registerOrganizationRoutes(app, db);
  registerProjectRoutes(app, db);
  registerRunRoutes(app, db);
  registerArtifactRoutes(app, db, storage);
  registerMetricRoutes(app, db);

  return app;
}
