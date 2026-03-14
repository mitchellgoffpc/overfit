import { API_BASE, API_VERSION } from "@underfit/types";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express, Request, Response } from "express";

import type { AppConfig } from "config";
import type { Database } from "db";
import { LogBuffer } from "logbuffer";
import { registerAccountRoutes } from "routes/accounts";
import { registerApiKeyRoutes } from "routes/api-keys";
import { registerArtifactRoutes } from "routes/artifacts";
import { registerAuthRoutes } from "routes/auth";
import { registerLogRoutes } from "routes/logs";
import { registerOrganizationMembershipRoutes } from "routes/organization-members";
import { registerOrganizationRoutes } from "routes/organizations";
import { registerProjectRoutes } from "routes/projects";
import { registerRunRoutes } from "routes/runs";
import { registerScalarRoutes } from "routes/scalars";
import { registerUserRoutes } from "routes/users";
import { createStorage } from "storage";

export function createApp(config: AppConfig, db: Database): Express {
  const app = express();
  const storage = createStorage(config.storage);
  const logBuffer = new LogBuffer(db, storage, config.logBuffer);
  logBuffer.start();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    express.json()(req, res, (err) => {
      req.body ??= {};
      next(err);
    });
  });

  app.get(`${API_BASE}/health`, (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });

  registerAuthRoutes(app, db);
  registerAccountRoutes(app, db);
  registerUserRoutes(app, db);
  registerApiKeyRoutes(app, db);
  registerOrganizationMembershipRoutes(app, db);
  registerOrganizationRoutes(app, db);
  registerProjectRoutes(app, db);
  registerRunRoutes(app, db);
  registerLogRoutes(app, db, logBuffer, storage);
  registerArtifactRoutes(app, db, storage);
  registerScalarRoutes(app, db);

  return app;
}
