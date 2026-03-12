import { API_BASE, API_VERSION } from "@underfit/types";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express, Request, Response } from "express";

import { DEFAULT_LOG_BUFFER_CONFIG } from "config";
import type { LogBufferConfig } from "config";
import type { Database } from "db";
import { LogBuffer } from "logbuffer";
import { registerAccountRoutes } from "routes/accounts";
import { registerArtifactRoutes } from "routes/artifacts";
import { registerAuthRoutes } from "routes/auth";
import { registerLogRoutes } from "routes/logs";
import { registerOrganizationRoutes } from "routes/organizations";
import { registerProjectRoutes } from "routes/projects";
import { registerRunRoutes } from "routes/runs";
import { registerScalarRoutes } from "routes/scalars";
import { registerUserRoutes } from "routes/users";
import type { StorageBackend } from "storage";

export function createApp(db: Database, storage: StorageBackend | null = null, logBufferConfig: LogBufferConfig = DEFAULT_LOG_BUFFER_CONFIG): Express {
  const app = express();
  const logBuffer = storage ? new LogBuffer(db, storage, logBufferConfig) : null;
  logBuffer?.start();

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
  registerOrganizationRoutes(app, db);
  registerProjectRoutes(app, db);
  registerRunRoutes(app, db);
  registerLogRoutes(app, db, logBuffer, storage);
  registerArtifactRoutes(app, db, storage);
  registerScalarRoutes(app, db);

  return app;
}
