import { API_BASE } from "@underfit/types";
import type { Scalar } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { getRun } from "repositories/runs";
import { createScalar, getScalars } from "repositories/scalars";

const CreateScalarBodySchema = z.strictObject({
  step: z.number().nullable().exactOptional().prefault(null),
  values: z.record(z.string(), z.number()),
  timestamp: z.string().min(1, "Scalar fields are required: timestamp")
});

type CreateScalarBody = z.infer<typeof CreateScalarBodySchema>;

export function registerScalarRoutes(app: RouteApp, db: Database): void {
  const createScalarHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Scalar, CreateScalarBody> = async (req, res) => {
    const { success, error, data } = CreateScalarBodySchema.safeParse(req.body);
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
      res.json(await createScalar(db, { runId: run.id, ...data }));
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
  app.post(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/scalars`, createScalarHandler);
}
