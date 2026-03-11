import { API_BASE, testSlug } from "@underfit/types";
import type { Run } from "@underfit/types";

import type { Database } from "db";
import { getRun, getRunByHandleProjectNameAndName, listRuns, listRunsByUser, upsertRun } from "repositories/runs";
import { getUserByHandle } from "repositories/users";
import type { RouteApp, RouteHandler, RouteParams } from "routes/helpers";

type UpsertRunPayload = Partial<Omit<Run, "id" | "createdAt" | "updatedAt">>;

export function registerRunRoutes(app: RouteApp, db: Database): void {
  const listRunsHandler: RouteHandler<Record<string, string>, Run[]> = async (_req, res) => {
    res.json(await listRuns(db));
  };

  const listRunsByHandleHandler: RouteHandler<{ handle: string }, Run[]> = async (req, res) => {
    const user = await getUserByHandle(db, req.params.handle.trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(await listRunsByUser(db, user.id));
    }
  };

  const getRunHandler: RouteHandler<RouteParams, Run> = async (req, res) => {
    const run = await getRun(db, req.params.id);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      res.json(run);
    }
  };

  const upsertRunHandler: RouteHandler<RouteParams, Run, UpsertRunPayload> = async (req, res) => {
    const id = req.params.id;
    const existing = await getRun(db, id);

    const projectId = req.body.projectId ?? existing?.projectId;
    const userId = req.body.userId ?? existing?.userId;
    const name = (req.body.name ?? existing?.name ?? "").trim().toLowerCase();
    const status = req.body.status ?? existing?.status;
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
        metadata: req.body.metadata ?? existing?.metadata ?? null
      });
      res.json(run);
    }
  };

  const getRunByHandleHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Run> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const projectName = req.params.projectName.trim().toLowerCase();
    const runName = req.params.runName.trim().toLowerCase();
    const run = await getRunByHandleProjectNameAndName(db, handle, projectName, runName);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      res.json(run);
    }
  };

  app.get(`${API_BASE}/runs`, listRunsHandler);
  app.get(`${API_BASE}/users/:handle/runs`, listRunsByHandleHandler);
  app.get(`${API_BASE}/runs/:id`, getRunHandler);
  app.put(`${API_BASE}/runs/:id`, upsertRunHandler);
  app.get(`${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName`, getRunByHandleHandler);
}
