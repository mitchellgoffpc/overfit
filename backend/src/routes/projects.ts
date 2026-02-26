import type { Express, Request, Response } from "express";

import type { Project } from "@app/shared";

import { nowIso, type ErrorResponse, type ID } from "./helpers";

type ProjectStore = Map<ID, Project>;

export function registerProjectRoutes(app: Express, apiBase: string, projects: ProjectStore) {
  app.get(`${apiBase}/projects`, (_req: Request, res: Response<Project[]>) => {
    res.json(Array.from(projects.values()));
  });

  app.get(`${apiBase}/projects/:id`, (req: Request, res: Response<Project | ErrorResponse>) => {
    const project = projects.get(req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json(project);
  });

  app.put(`${apiBase}/projects/:id`, (req: Request<unknown, Project | ErrorResponse, Partial<Project>>, res: Response<Project | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body ?? {};
    const existing = projects.get(id);

    const name = payload.name ?? existing?.name;

    if (!name) {
      res.status(400).json({ error: "Project name is required" });
      return;
    }

    const createdAt = existing?.createdAt ?? payload.createdAt ?? nowIso();

    const project: Project = {
      id,
      name,
      description: payload.description ?? existing?.description,
      createdAt,
      updatedAt: nowIso()
    };

    projects.set(id, project);
    res.json(project);
  });
}
