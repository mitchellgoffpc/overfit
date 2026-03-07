import type { Project } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getProject, listProjects, upsertProject } from "repositories/projects";
import { nowIso } from "routes/helpers";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertProjectPayload = Partial<Omit<Project, "id" | "updatedAt">>;

export function registerProjectRoutes(app: RouteApp, apiBase: string, db: Database): void {
  const listProjectsHandler: RequestHandler<Record<string, string>, Project[]> = async (_req, res) => {
    res.json(await listProjects(db));
  };

  const getProjectHandler: RequestHandler<RouteParams, Project | ErrorResponse> = async (req, res) => {
    const project = await getProject(db, req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(project);
    }
  };

  const upsertProjectHandler: RequestHandler<RouteParams, Project | ErrorResponse, UpsertProjectPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getProject(db, id);

    const name = req.body?.name ?? existing?.name;
    const missingFields = Object.entries({ name }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Project fields are required: ${missingFields.join(", ")}` });
    } else {
      const project: Project = {
        id,
        name,
        description: req.body?.description ?? existing?.description ?? null,
        createdAt: existing?.createdAt ?? req.body?.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      await upsertProject(db, project);
      res.json(project);
    }
  };

  app.get(`${apiBase}/projects`, listProjectsHandler);
  app.get(`${apiBase}/projects/:id`, getProjectHandler);
  app.put(`${apiBase}/projects/:id`, upsertProjectHandler);
}
