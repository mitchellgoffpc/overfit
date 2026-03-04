import type { Run } from "@overfit/types";

import type { ErrorResponse, RouteApp, RouteParams, RouteRequest, RouteResponse, UpsertRunPayload } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerRunRoutes(app: RouteApp, apiBase: string, runs: EntityStore<Run>): void {
  app.get(`${apiBase}/runs`, (_req: RouteRequest, res: RouteResponse<Run[]>) => {
    res.json(runs.list());
  });

  app.get(`${apiBase}/runs/:id`, (req: RouteRequest<RouteParams>, res: RouteResponse<Run | ErrorResponse>) => {
    const run = runs.get(req.params.id);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    res.json(run);
  });

  app.put(
    `${apiBase}/runs/:id`,
    (req: RouteRequest<RouteParams, Run | ErrorResponse, UpsertRunPayload>, res: RouteResponse<Run | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = runs.get(id);

    const projectId = payload.projectId ?? existing?.projectId;
    const name = payload.name ?? existing?.name;
    const status = payload.status ?? existing?.status;

    for (const [label, value] of Object.entries({ projectId, name, status })) {
      if (!value) {
        res.status(400).json({ error: `Run ${label} is required` });
        return;
      }
    }

    const run: Run = {
      id,
      projectId,
      name,
      status,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
      updatedAt: nowIso(),
      startedAt: payload.startedAt ?? existing?.startedAt,
      finishedAt: payload.finishedAt ?? existing?.finishedAt,
      metadata: payload.metadata ?? existing?.metadata
    };

    runs.upsert(run);
    res.json(run);
  });
}
