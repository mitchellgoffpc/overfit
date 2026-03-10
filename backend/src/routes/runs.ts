import { API_BASE, testSlug } from "@underfit/types";
import type { Run } from "@underfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getRun, listRuns, upsertRun } from "repositories/runs";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertRunPayload = Partial<Omit<Run, "id" | "createdAt" | "updatedAt">>;

export function registerRunRoutes(app: RouteApp, db: Database): void {
  const listRunsHandler: RequestHandler<Record<string, string>, Run[]> = async (_req, res) => {
    res.json(await listRuns(db));
  };

  const getRunHandler: RequestHandler<RouteParams, Run | ErrorResponse> = async (req, res) => {
    const run = await getRun(db, req.params.id);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      res.json(run);
    }
  };

  const upsertRunHandler: RequestHandler<RouteParams, Run | ErrorResponse, UpsertRunPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getRun(db, id);

    const projectId = req.body?.projectId ?? existing?.projectId;
    const userId = req.body?.userId ?? existing?.userId;
    const name = (req.body?.name ?? existing?.name ?? "").trim().toLowerCase();
    const status = req.body?.status ?? existing?.status;
    const missingFields = Object.entries({ projectId, userId, name, status }).filter(([, value]) => !value).map(([label]) => label);

    const nameError = testSlug(name);
    if (missingFields.length > 0) {
      res.status(400).json({ error: `Run fields are required: ${missingFields.join(", ")}` });
    } else if (nameError) {
      res.status(400).json({ error: nameError });
    } else {
      const run = await upsertRun(db, {
        id,
        projectId,
        userId,
        name,
        status,
        metadata: req.body?.metadata ?? existing?.metadata ?? null
      });
      res.json(run);
    }
  };

  app.get(`${API_BASE}/runs`, listRunsHandler);
  app.get(`${API_BASE}/runs/:id`, getRunHandler);
  app.put(`${API_BASE}/runs/:id`, upsertRunHandler);
}
