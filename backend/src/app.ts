import { API_BASE, API_VERSION } from "@underfit/types";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Express, Request, Response } from "express";

import { LogBuffer } from "buffers/logs";
import { ScalarBuffer } from "buffers/scalars";
import type { AppConfig } from "config";
import type { Database } from "db";
import { registerAccountAvatarRoutes } from "routes/account-avatars";
import { registerAccountRoutes } from "routes/accounts";
import { registerApiKeyRoutes } from "routes/api-keys";
import { registerArtifactRoutes } from "routes/artifacts";
import { registerAuthRoutes } from "routes/auth";
import { registerCollaboratorRoutes } from "routes/collaborators";
import { registerFileRoutes } from "routes/files";
import { registerLogRoutes } from "routes/logs";
import { registerMediaRoutes } from "routes/media";
import { registerOrganizationMembershipRoutes } from "routes/organization-members";
import { registerOrganizationRoutes } from "routes/organizations";
import { registerProjectRoutes } from "routes/projects";
import { registerRunRoutes } from "routes/runs";
import { registerScalarRoutes } from "routes/scalars";
import { registerUserRoutes } from "routes/users";
import { StorageBackfillService } from "storage/backfill";
import { createStorage } from "storage/index";

export function createApp(config: AppConfig, db: Database): Express {
  const app = express();
  const storage = createStorage(config.storage);
  const logBuffer = new LogBuffer(db, storage, config.logBuffer);
  const scalarBuffer = new ScalarBuffer(db, storage, config.logBuffer);
  logBuffer.start();
  scalarBuffer.start();
  const storageBackfill = config.backfill.enabled ? new StorageBackfillService(db, storage, config.backfill, config.logBuffer) : null;
  storageBackfill?.start();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    express.json()(req, res, (err) => {
      req.body ??= {};
      next(err);
    });
  });

  registerAuthRoutes(app, db);
  registerAccountRoutes(app, db);
  registerUserRoutes(app, db);
  registerAccountAvatarRoutes(app, db);
  registerApiKeyRoutes(app, db);
  registerOrganizationMembershipRoutes(app, db);
  registerOrganizationRoutes(app, db);
  registerProjectRoutes(app, db);
  registerCollaboratorRoutes(app, db);
  registerRunRoutes(app, db);
  registerLogRoutes(app, db, logBuffer, storage);
  registerArtifactRoutes(app, db, storage);
  registerFileRoutes(app, db, storage);
  registerMediaRoutes(app, db, storage);
  registerScalarRoutes(app, db, scalarBuffer, storage);

  app.get(`${API_BASE}/health`, (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Route not found" });
  });

  return app;
}
