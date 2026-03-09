import { API_BASE } from "@underfit/types";
import type { Datapoint } from "@underfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getDatapoint, listDatapoints, upsertDatapoint } from "repositories/datapoints";
import { hasRun } from "repositories/runs";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertDatapointPayload = Partial<Omit<Datapoint, "id">>;

export function registerDatapointRoutes(app: RouteApp, db: Database): void {
  const listDatapointsHandler: RequestHandler<{ runId: string }, Datapoint[]> = async (req, res) => {
    res.json(await listDatapoints(db, req.params.runId));
  };

  const getDatapointHandler: RequestHandler<RouteParams, Datapoint | ErrorResponse> = async (req, res) => {
    const datapoint = await getDatapoint(db, req.params.id);

    if (!datapoint) {
      res.status(404).json({ error: "Datapoint not found" });
    } else {
      res.json(datapoint);
    }
  };

  const upsertDatapointHandler: RequestHandler<RouteParams, Datapoint | ErrorResponse, UpsertDatapointPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getDatapoint(db, id);

    const runId = req.body?.runId ?? existing?.runId;
    const scalars = req.body?.scalars ?? existing?.scalars;
    const timestamp = req.body?.timestamp ?? existing?.timestamp;
    const missingFields = Object.entries({ runId, timestamp }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Datapoint fields are required: ${missingFields.join(", ")}` });
    } else if (!await hasRun(db, runId)) {
      res.status(400).json({ error: "Datapoint runId does not reference an existing run" });
    } else if (!scalars || typeof scalars !== "object" || Array.isArray(scalars)) {
      res.status(400).json({ error: "Datapoint scalars must be an object mapping names to numbers" });
    } else if (Object.values(scalars).some((v) => typeof v !== "number")) {
      res.status(400).json({ error: "Datapoint scalars must be an object mapping names to numbers" });
    } else {
      const datapoint: Datapoint = {
        id,
        runId,
        step: req.body?.step ?? existing?.step ?? null,
        scalars,
        timestamp,
      };

      await upsertDatapoint(db, datapoint);
      res.json(datapoint);
    }
  };

  app.get(`${API_BASE}/runs/:runId/datapoints`, listDatapointsHandler);
  app.get(`${API_BASE}/datapoints/:id`, getDatapointHandler);
  app.put(`${API_BASE}/datapoints/:id`, upsertDatapointHandler);
}
