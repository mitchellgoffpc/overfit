import { API_BASE } from "@underfit/types";
import type { Artifact } from "@underfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { getArtifact, listArtifacts, upsertArtifact } from "repositories/artifacts";
import { hasRun } from "repositories/runs";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

type UpsertArtifactPayload = Partial<Omit<Artifact, "id" | "createdAt" | "updatedAt">>;

export function registerArtifactRoutes(app: RouteApp, db: Database): void {
  const listArtifactsHandler: RequestHandler<Record<string, string>, Artifact[]> = async (_req, res) => {
    res.json(await listArtifacts(db));
  };

  const getArtifactHandler: RequestHandler<RouteParams, Artifact | ErrorResponse> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else {
      res.json(artifact);
    }
  };

  const upsertArtifactHandler: RequestHandler<RouteParams, Artifact | ErrorResponse, UpsertArtifactPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getArtifact(db, id);

    const runId = req.body?.runId ?? existing?.runId;
    const name = req.body?.name ?? existing?.name;
    const type = req.body?.type ?? existing?.type;
    const version = req.body?.version ?? existing?.version;
    const missingFields = Object.entries({ runId, name, type, version }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Artifact fields are required: ${missingFields.join(", ")}` });
    } else if (!await hasRun(db, runId)) {
      res.status(400).json({ error: "Artifact runId does not reference an existing run" });
    } else {
      const artifact = await upsertArtifact(db, {
        id,
        runId,
        name,
        type,
        version,
        uri: req.body?.uri ?? existing?.uri ?? null,
        metadata: req.body?.metadata ?? existing?.metadata ?? null
      });
      res.json(artifact);
    }
  };

  app.get(`${API_BASE}/artifacts`, listArtifactsHandler);
  app.get(`${API_BASE}/artifacts/:id`, getArtifactHandler);
  app.put(`${API_BASE}/artifacts/:id`, upsertArtifactHandler);
}
