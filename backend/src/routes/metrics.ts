import type { Metric, Run } from "@overfit/types";
import type { Request, Response } from "express";

import type { ErrorResponse, ID, RouteApp } from "routes/helpers";
import type { EntityStore } from "storage/types";

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
      const metricValue = payload.value ?? existing?.value;
      const timestamp = payload.timestamp ?? existing?.timestamp;

      for (const [label, value] of Object.entries({ runId, name, timestamp })) {
        if (!value) {
          res.status(400).json({ error: `Metric ${label} is required` });
          return;
        }
      }

      if (!runs.has(runId)) {
        res.status(400).json({ error: "Metric runId does not reference an existing run" });
        return;
      }

      if (typeof metricValue !== "number") {
        res.status(400).json({ error: "Metric value must be a number" });
        return;
      }

      const metric: Metric = {
        id,
        runId,
        name,
        value: metricValue,
        step: payload.step ?? existing?.step,
        timestamp
      };

      metrics.upsert(metric);
      res.json(metric);
    }
  );

  return app;
}
