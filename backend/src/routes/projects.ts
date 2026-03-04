import type { Project } from "@overfit/types";
import type { RequestHandler } from "express";

import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

type UpsertProjectPayload = Partial<Omit<Project, "id" | "updatedAt">>;

export function registerProjectRoutes(app: RouteApp, apiBase: string, projects: EntityStore<Project>): void {
  const listProjects: RequestHandler<Record<string, string>, Project[]> = (_req, res) => {
    res.json(projects.list());
  };

  const getProject: RequestHandler<RouteParams, Project | ErrorResponse> = (req, res) => {
    const project = projects.get(req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(project);
    }
  };

  const upsertProject: RequestHandler<RouteParams, Project | ErrorResponse, UpsertProjectPayload> = (req, res) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = projects.get(id);

    const name = payload.name ?? existing?.name;
    const missingFields = Object.entries({ name }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Project fields are required: ${missingFields.join(", ")}` });
    } else {
      const project: Project = {
        id,
        name,
        description: payload.description ?? existing?.description,
        createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      projects.upsert(project);
      res.json(project);
    }
  };

  app.get(`${apiBase}/projects`, listProjects);
  app.get(`${apiBase}/projects/:id`, getProject);
  app.put(`${apiBase}/projects/:id`, upsertProject);
}
