import type { Metric, Run } from "@overfit/types";
import type { RequestHandler } from "express";

import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";
import type { EntityStore } from "storage/types";

type UpsertMetricPayload = Partial<Omit<Metric, "id">>;

export function registerMetricRoutes(app: RouteApp, apiBase: string, metrics: EntityStore<Metric>, runs: EntityStore<Run>): void {
  const listMetrics: RequestHandler<Record<string, string>, Metric[]> = (_req, res) => {
    res.json(metrics.list());
  };

  const getMetric: RequestHandler<RouteParams, Metric | ErrorResponse> = (req, res) => {
    const metric = metrics.get(req.params.id);

    if (!metric) {
      res.status(404).json({ error: "Metric not found" });
    } else {
      res.json(metric);
    }
  };

  const upsertMetric: RequestHandler<RouteParams, Metric | ErrorResponse, UpsertMetricPayload> = (req, res) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = metrics.get(id);

    const runId = payload.runId ?? existing?.runId;
    const name = payload.name ?? existing?.name;
    const metricValue = payload.value ?? existing?.value;
    const timestamp = payload.timestamp ?? existing?.timestamp;
    const missingFields = Object.entries({ runId, name, timestamp }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Metric fields are required: ${missingFields.join(", ")}` });
    } else if (!runs.has(runId)) {
      res.status(400).json({ error: "Metric runId does not reference an existing run" });
    } else if (typeof metricValue !== "number") {
      res.status(400).json({ error: "Metric value must be a number" });
    } else {
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
  };

  app.get(`${apiBase}/metrics`, listMetrics);
  app.get(`${apiBase}/metrics/:id`, getMetric);
  app.put(`${apiBase}/metrics/:id`, upsertMetric);
}
