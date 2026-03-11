import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { Scalar } from "@underfit/types";

import type { Database } from "db";
import { getRunByHandleProjectNameAndName } from "repositories/runs";
import { getScalars, insertScalar } from "repositories/scalars";
import type { RouteApp, RouteHandler } from "routes/helpers";

export function registerScalarRoutes(app: RouteApp, db: Database): void {
  const insertScalarHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Scalar, Partial<Omit<Scalar, "id" | "runId">>> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRunByHandleProjectNameAndName(db, handle, projectName, runName);
    const values = req.body.values;
    const timestamp = req.body.timestamp;
    const missingFields = Object.entries({ timestamp }).filter(([, value]) => !value).map(([label]) => label);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else if (missingFields.length > 0) {
      res.status(400).json({ error: `Scalar fields are required: ${missingFields.join(", ")}` });
    } else if (!values || typeof values !== "object" || Array.isArray(values)) {
      res.status(400).json({ error: "Scalar values must be an object mapping names to numbers" });
    } else if (Object.values(values).some((v) => typeof v !== "number")) {
      res.status(400).json({ error: "Scalar values must be an object mapping names to numbers" });
    } else {
      const scalar: Scalar = {
        id: randomBytes(12).toString("hex"),
        runId: run.id,
        step: req.body.step ?? null,
        values,
        timestamp,
      };

      await insertScalar(db, scalar);
      res.json(scalar);
    }
  };

  const getScalarsHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Scalar[]> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const scalars = await getScalars(db, handle, projectName, runName);
    if (scalars.length === 0) {
      const run = await getRunByHandleProjectNameAndName(db, handle, projectName, runName);
      if (!run) {
        res.status(404).json({ error: "Run not found" });
        return;
      }
    }
    res.json(scalars);
  };

  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/scalars`, getScalarsHandler);
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/scalars`, insertScalarHandler);
}
