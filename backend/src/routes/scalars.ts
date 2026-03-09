import { API_BASE } from "@underfit/types";
import type { Scalar } from "@underfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getScalar, listScalars, upsertScalar } from "repositories/scalars";
import { hasRun } from "repositories/runs";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertScalarPayload = Partial<Omit<Scalar, "id">>;

export function registerScalarRoutes(app: RouteApp, db: Database): void {
  const listScalarsHandler: RequestHandler<{ runId: string }, Scalar[]> = async (req, res) => {
    res.json(await listScalars(db, req.params.runId));
  };

  const getScalarHandler: RequestHandler<RouteParams, Scalar | ErrorResponse> = async (req, res) => {
    const scalar = await getScalar(db, req.params.id);

    if (!scalar) {
      res.status(404).json({ error: "Scalar not found" });
    } else {
      res.json(scalar);
    }
  };

  const upsertScalarHandler: RequestHandler<RouteParams, Scalar | ErrorResponse, UpsertScalarPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getScalar(db, id);

    const runId = req.body?.runId ?? existing?.runId;
    const values = req.body?.values ?? existing?.values;
    const timestamp = req.body?.timestamp ?? existing?.timestamp;
    const missingFields = Object.entries({ runId, timestamp }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Scalar fields are required: ${missingFields.join(", ")}` });
    } else if (!await hasRun(db, runId)) {
      res.status(400).json({ error: "Scalar runId does not reference an existing run" });
    } else if (!values || typeof values !== "object" || Array.isArray(values)) {
      res.status(400).json({ error: "Scalar values must be an object mapping names to numbers" });
    } else if (Object.values(values).some((v) => typeof v !== "number")) {
      res.status(400).json({ error: "Scalar values must be an object mapping names to numbers" });
    } else {
      const scalar: Scalar = {
        id,
        runId,
        step: req.body?.step ?? existing?.step ?? null,
        values,
        timestamp,
      };

      await upsertScalar(db, scalar);
      res.json(scalar);
    }
  };

  app.get(`${API_BASE}/runs/:runId/scalars`, listScalarsHandler);
  app.get(`${API_BASE}/scalars/:id`, getScalarHandler);
  app.put(`${API_BASE}/scalars/:id`, upsertScalarHandler);
}
