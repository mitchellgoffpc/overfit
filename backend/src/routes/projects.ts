import type { Project } from "@overfit/types";

import type { ErrorResponse, RouteApp, RouteParams, RouteRequest, RouteResponse, UpsertProjectPayload } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerProjectRoutes(app: RouteApp, apiBase: string, projects: EntityStore<Project>): void {
  app.get(`${apiBase}/projects`, (_req: RouteRequest, res: RouteResponse<Project[]>) => {
    res.json(projects.list());
  });

  app.get(`${apiBase}/projects/:id`, (req: RouteRequest<RouteParams>, res: RouteResponse<Project | ErrorResponse>) => {
    const project = projects.get(req.params.id);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(project);
    }
  });

  app.put(
    `${apiBase}/projects/:id`,
    (req: RouteRequest<RouteParams, Project | ErrorResponse, UpsertProjectPayload>, res: RouteResponse<Project | ErrorResponse>) => {
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
  });
}
