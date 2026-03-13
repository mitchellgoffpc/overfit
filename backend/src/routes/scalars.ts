import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { Scalar } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { getRun } from "repositories/runs";
import { getScalars, insertScalar } from "repositories/scalars";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const InsertScalarBodySchema = z.strictObject({
  step: z.number().nullable().optional(),
  values: z.record(z.string(), z.number()),
  timestamp: z.string().min(1, "Scalar fields are required: timestamp")
});

type InsertScalarBody = z.infer<typeof InsertScalarBodySchema>;

export function registerScalarRoutes(app: RouteApp, db: Database): void {
  const insertScalarHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Scalar, InsertScalarBody> = async (req, res) => {
    const { success, error, data: { step, values, timestamp } = {} } = InsertScalarBodySchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRun(db, handle, projectName, runName);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      const scalar = await insertScalar(db, {
        id: randomBytes(12).toString("hex"),
        runId: run.id,
        step: step ?? null,
        values,
        timestamp,
      });
      res.json(scalar);
    }
  };

  const getScalarsHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Scalar[]> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const scalars = await getScalars(db, handle, projectName, runName);
    if (scalars.length === 0) {
      const run = await getRun(db, handle, projectName, runName);
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
