import type { Team } from "@app/shared";
import type { Request, Response } from "express";


import { nowIso } from "./helpers";
import type { ErrorResponse, ID, RouteApp } from "./helpers";

type TeamStore = Map<ID, Team>;

export function registerTeamRoutes(app: RouteApp, apiBase: string, teams: TeamStore): void {
  app.get(`${apiBase}/teams`, (_req: Request, res: Response<Team[]>) => {
    res.json(Array.from(teams.values()));
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

    if (!name) {
      res.status(400).json({ error: "Team name is required" });
      return;
    }

    if (!slug) {
      res.status(400).json({ error: "Team slug is required" });
      return;
    }

    const createdAt = existing?.createdAt ?? payload.createdAt ?? nowIso();

    const team: Team = {
      id,
      name,
      slug,
      createdAt,
      updatedAt: nowIso()
    };

    teams.set(id, team);
    res.json(team);
  });
}
