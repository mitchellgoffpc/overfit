import cors from "cors";
import express, { type Request, type Response } from "express";

import { API_VERSION, type Artifact, type Metric, type Project, type Run, type Team, type User } from "@app/shared";

import { registerArtifactRoutes } from "./routes/artifacts";
import { registerMetricRoutes } from "./routes/metrics";
import { registerProjectRoutes } from "./routes/projects";
import { registerRunRoutes } from "./routes/runs";
import { registerTeamRoutes } from "./routes/teams";
import { registerUserRoutes } from "./routes/users";
import type { ID } from "./routes/helpers";

export function createApp() {
  const app = express();

  const users = new Map<ID, User>();
  const teams = new Map<ID, Team>();
  const projects = new Map<ID, Project>();
  const runs = new Map<ID, Run>();
  const artifacts = new Map<ID, Artifact>();
  const metrics = new Map<ID, Metric>();

  app.use(cors());
  app.use(express.json());

  const apiBase = `/api/${API_VERSION}`;

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", version: API_VERSION });
  });

  registerUserRoutes(app, apiBase, users);
  registerTeamRoutes(app, apiBase, teams);
  registerProjectRoutes(app, apiBase, projects);
  registerRunRoutes(app, apiBase, runs);
  registerArtifactRoutes(app, apiBase, artifacts, runs);
  registerMetricRoutes(app, apiBase, metrics, runs);

  return app;
}
