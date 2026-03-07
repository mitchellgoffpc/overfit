import type { Metric } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getMetric, listMetrics, upsertMetric } from "repositories/metrics";
import { hasRun } from "repositories/runs";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertMetricPayload = Partial<Omit<Metric, "id">>;

export function registerMetricRoutes(app: RouteApp, apiBase: string, db: Database): void {
  const listMetricsHandler: RequestHandler<Record<string, string>, Metric[]> = async (_req, res) => {
    res.json(await listMetrics(db));
  };

  const getMetricHandler: RequestHandler<RouteParams, Metric | ErrorResponse> = async (req, res) => {
    const metric = await getMetric(db, req.params.id);

    if (!metric) {
      res.status(404).json({ error: "Metric not found" });
    } else {
      res.json(metric);
    }
  };

  const upsertMetricHandler: RequestHandler<RouteParams, Metric | ErrorResponse, UpsertMetricPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getMetric(db, id);

    const runId = req.body?.runId ?? existing?.runId;
    const name = req.body?.name ?? existing?.name;
    const metricValue = req.body?.value ?? existing?.value;
    const timestamp = req.body?.timestamp ?? existing?.timestamp;
    const missingFields = Object.entries({ runId, name, timestamp }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Metric fields are required: ${missingFields.join(", ")}` });
    } else if (!await hasRun(db, runId)) {
      res.status(400).json({ error: "Metric runId does not reference an existing run" });
    } else if (typeof metricValue !== "number") {
      res.status(400).json({ error: "Metric value must be a number" });
    } else {
      const metric: Metric = {
        id,
        runId,
        name,
        value: metricValue,
        step: req.body?.step ?? existing?.step ?? null,
        timestamp
      };

      await upsertMetric(db, metric);
      res.json(metric);
    }
  };

  app.get(`${apiBase}/metrics`, listMetricsHandler);
  app.get(`${apiBase}/metrics/:id`, getMetricHandler);
  app.put(`${apiBase}/metrics/:id`, upsertMetricHandler);
}
