import type { Team } from "@overfit/types";

import type { ErrorResponse, RouteApp, RouteParams, RouteRequest, RouteResponse, UpsertTeamPayload } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerTeamRoutes(app: RouteApp, apiBase: string, teams: EntityStore<Team>): void {
  app.get(`${apiBase}/teams`, (_req: RouteRequest, res: RouteResponse<Team[]>) => {
    res.json(teams.list());
  });

  app.get(`${apiBase}/teams/:id`, (req: RouteRequest<RouteParams>, res: RouteResponse<Team | ErrorResponse>) => {
    const team = teams.get(req.params.id);

    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    res.json(team);
  });

  app.put(
    `${apiBase}/teams/:id`,
    (req: RouteRequest<RouteParams, Team | ErrorResponse, UpsertTeamPayload>, res: RouteResponse<Team | ErrorResponse>) => {
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
