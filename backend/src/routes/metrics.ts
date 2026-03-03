import type { Metric, Run } from "@app/shared";
import type { Request, Response } from "express";

import type { EntityStore } from "../storage/types";

import type { ErrorResponse, ID, RouteApp } from "./helpers";

export function registerMetricRoutes(app: RouteApp, apiBase: string, metrics: EntityStore<Metric>, runs: EntityStore<Run>): RouteApp {
  app.get(`${apiBase}/metrics`, (_req: Request, res: Response<Metric[]>) => {
    res.json(metrics.list());
  });

  app.get(`${apiBase}/metrics/:id`, (req: Request<{ id: ID }>, res: Response<Metric | ErrorResponse>) => {
    const metric = metrics.get(req.params.id);

    if (!metric) {
      res.status(404).json({ error: "Metric not found" });
      return;
    }

    res.json(metric);
  });

  app.put(
    `${apiBase}/metrics/:id`,
    (req: Request<{ id: ID }, Metric | ErrorResponse, Partial<Metric>>, res: Response<Metric | ErrorResponse>) => {
      const id = req.params.id;
      const payload = req.body;
      const existing = metrics.get(id);

      const runId = payload.runId ?? existing?.runId;
      const name = payload.name ?? existing?.name;
      const value = payload.value ?? existing?.value;
      const timestamp = payload.timestamp ?? existing?.timestamp;

      if (!runId) {
        res.status(400).json({ error: "Metric runId is required" });
        return;
      }

      if (!runs.has(runId)) {
        res.status(400).json({ error: "Metric runId does not reference an existing run" });
        return;
      }

      if (!name) {
        res.status(400).json({ error: "Metric name is required" });
        return;
      }

      if (typeof value !== "number") {
        res.status(400).json({ error: "Metric value must be a number" });
        return;
      }

      if (!timestamp) {
        res.status(400).json({ error: "Metric timestamp is required" });
        return;
      }

      const metric: Metric = {
        id,
        runId,
        name,
        value,
        step: payload.step ?? existing?.step,
        timestamp
      };

      metrics.upsert(metric);
      res.json(metric);
    }
  );

  return app;
}
