import type { Run } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getRun, listRuns, upsertRun } from "db/repositories/runs";
import { nowIso } from "routes/helpers";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertRunPayload = Partial<Omit<Run, "id" | "updatedAt">>;

export function registerRunRoutes(app: RouteApp, apiBase: string, db: Database): void {
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
    const name = req.body?.name ?? existing?.name;
    const status = req.body?.status ?? existing?.status;
    const missingFields = Object.entries({ projectId, name, status }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Run fields are required: ${missingFields.join(", ")}` });
    } else {
      const run: Run = {
        id,
        projectId,
        name,
        status,
        createdAt: existing?.createdAt ?? req.body?.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        startedAt: req.body?.startedAt ?? existing?.startedAt ?? null,
        finishedAt: req.body?.finishedAt ?? existing?.finishedAt ?? null,
        metadata: req.body?.metadata ?? existing?.metadata ?? null
      };

      await upsertRun(db, run);
      res.json(run);
    }
  };

  app.get(`${apiBase}/runs`, listRunsHandler);
  app.get(`${apiBase}/runs/:id`, getRunHandler);
  app.put(`${apiBase}/runs/:id`, upsertRunHandler);
}
