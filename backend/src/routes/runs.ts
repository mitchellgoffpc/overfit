import type { Run } from "@overfit/types";
import type { RequestHandler } from "express";

import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

type UpsertRunPayload = Partial<Omit<Run, "id" | "updatedAt">>;

export function registerRunRoutes(app: RouteApp, apiBase: string, runs: EntityStore<Run>): void {
  const listRuns: RequestHandler<Record<string, string>, Run[]> = (_req, res) => {
    res.json(runs.list());
  };

  const getRun: RequestHandler<RouteParams, Run | ErrorResponse> = (req, res) => {
    const run = runs.get(req.params.id);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      res.json(run);
    }
  };

  const upsertRun: RequestHandler<RouteParams, Run | ErrorResponse, UpsertRunPayload> = (req, res) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = runs.get(id);

    const projectId = payload.projectId ?? existing?.projectId;
    const name = payload.name ?? existing?.name;
    const status = payload.status ?? existing?.status;
    const missingFields = Object.entries({ projectId, name, status }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Run fields are required: ${missingFields.join(", ")}` });
    } else {
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
    }
  };

  app.get(`${apiBase}/runs`, listRuns);
  app.get(`${apiBase}/runs/:id`, getRun);
  app.put(`${apiBase}/runs/:id`, upsertRun);
}
