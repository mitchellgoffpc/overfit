import type { Project } from "@app/shared";
import type { Request, Response } from "express";

import type { ErrorResponse, ID, RouteApp } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerProjectRoutes(app: RouteApp, apiBase: string, projects: EntityStore<Project>): void {
  app.get(`${apiBase}/projects`, (_req: Request, res: Response<Project[]>) => {
    res.json(projects.list());
  });

  app.get(`${apiBase}/projects/:id`, (req: Request<{ id: ID }>, res: Response<Project | ErrorResponse>) => {
    const project = projects.get(req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(project);
  });

  app.put(`${apiBase}/projects/:id`, (req: Request<{ id: ID }, Project | ErrorResponse, Partial<Project>>, res: Response<Project | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = projects.get(id);

    const name = payload.name ?? existing?.name;

    for (const [label, value] of Object.entries({ name })) {
      if (!value) {
        res.status(400).json({ error: `Project ${label} is required` });
        return;
      }
    }

    const project: Project = {
      id,
      name,
      description: payload.description ?? existing?.description,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
      updatedAt: nowIso()
    };

    projects.upsert(project);
    res.json(project);
  });
}
