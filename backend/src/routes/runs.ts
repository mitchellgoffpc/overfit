import type { Run } from "@app/shared";
import type { Request, Response } from "express";


import { nowIso } from "./helpers";
import type { ErrorResponse, ID, RouteApp } from "./helpers";

type RunStore = Map<ID, Run>;

export function registerRunRoutes(app: RouteApp, apiBase: string, runs: RunStore): void {
  app.get(`${apiBase}/runs`, (_req: Request, res: Response<Run[]>) => {
    res.json(Array.from(runs.values()));
  });

  app.get(`${apiBase}/runs/:id`, (req: Request<{ id: ID }>, res: Response<Run | ErrorResponse>) => {
    const run = runs.get(req.params.id);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    res.json(run);
  });

  app.put(`${apiBase}/runs/:id`, (req: Request<{ id: ID }, Run | ErrorResponse, Partial<Run>>, res: Response<Run | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = runs.get(id);

    const projectId = payload.projectId ?? existing?.projectId;
    const name = payload.name ?? existing?.name;
    const status = payload.status ?? existing?.status;

    if (!projectId) {
      res.status(400).json({ error: "Run projectId is required" });
      return;
    }

    if (!name) {
      res.status(400).json({ error: "Run name is required" });
      return;
    }

    if (!status) {
      res.status(400).json({ error: "Run status is required" });
      return;
    }

    const createdAt = existing?.createdAt ?? payload.createdAt ?? nowIso();

    const run: Run = {
      id,
      projectId,
      name,
      status,
      createdAt,
      updatedAt: nowIso(),
      startedAt: payload.startedAt ?? existing?.startedAt,
      finishedAt: payload.finishedAt ?? existing?.finishedAt,
      metadata: payload.metadata ?? existing?.metadata
    };

    runs.set(id, run);
    res.json(run);
  });
}
