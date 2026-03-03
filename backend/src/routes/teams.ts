import type { Team } from "@app/shared";
import type { Request, Response } from "express";

import type { ErrorResponse, ID, RouteApp } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerTeamRoutes(app: RouteApp, apiBase: string, teams: EntityStore<Team>): void {
  app.get(`${apiBase}/teams`, (_req: Request, res: Response<Team[]>) => {
    res.json(teams.list());
  });

  app.get(`${apiBase}/teams/:id`, (req: Request<{ id: ID }>, res: Response<Team | ErrorResponse>) => {
    const team = teams.get(req.params.id);

    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    res.json(team);
  });

  app.put(`${apiBase}/teams/:id`, (req: Request<{ id: ID }, Team | ErrorResponse, Partial<Team>>, res: Response<Team | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = teams.get(id);

    const name = payload.name ?? existing?.name;
    const slug = payload.slug ?? existing?.slug;

    for (const [label, value] of Object.entries({ name, slug })) {
      if (!value) {
        res.status(400).json({ error: `Team ${label} is required` });
        return;
      }
    }

    const team: Team = {
      id,
      name,
      slug,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
      updatedAt: nowIso()
    };

    teams.upsert(team);
    res.json(team);
  });
}
