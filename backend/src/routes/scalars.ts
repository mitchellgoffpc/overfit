import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { Scalar } from "@underfit/types";

import type { Database } from "db";
import { getRunByHandleProjectNameAndName, hasRun } from "repositories/runs";
import { insertScalar, listScalars, listScalarsByHandleProjectNameAndRunName } from "repositories/scalars";
import type { RouteApp, RouteHandler } from "routes/helpers";

export function registerScalarRoutes(app: RouteApp, db: Database): void {
  const listScalarsHandler: RouteHandler<{ runId: string }, Scalar[]> = async (req, res) => {
    res.json(await listScalars(db, req.params.runId));
  };

  const insertScalarHandler: RouteHandler<{ runId: string }, Scalar, Partial<Omit<Scalar, "id" | "runId">>> = async (req, res) => {
    const runId = req.params.runId;
    const values = req.body.values;
    const timestamp = req.body.timestamp;
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
        id: randomBytes(12).toString("hex"),
        runId,
        step: req.body.step ?? null,
        values,
        timestamp,
      };

      await insertScalar(db, scalar);
      res.json(scalar);
    }
  };

  const getScalarsByHandleHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Scalar[]> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const scalars = await listScalarsByHandleProjectNameAndRunName(db, handle, projectName, runName);
    if (scalars.length === 0) {
      const run = await getRunByHandleProjectNameAndName(db, handle, projectName, runName);
      if (!run) {
        res.status(404).json({ error: "Run not found" });
        return;
      }
    }
    res.json(scalars);
  };

  app.get(`${API_BASE}/runs/:runId/scalars`, listScalarsHandler);
  app.post(`${API_BASE}/runs/:runId/scalars`, insertScalarHandler);
  app.get(`${API_BASE}/accounts/by-handle/:handle/projects/:projectName/runs/:runName/scalars`, getScalarsByHandleHandler);
}
