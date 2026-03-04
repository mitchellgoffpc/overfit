import type { Artifact, Run } from "@overfit/types";
import type { RequestHandler } from "express";

import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

type UpsertArtifactPayload = Partial<Omit<Artifact, "id" | "updatedAt">>;

export function registerArtifactRoutes(app: RouteApp, apiBase: string, artifacts: EntityStore<Artifact>, runs: EntityStore<Run>): void {
  const listArtifacts: RequestHandler<Record<string, string>, Artifact[]> = (_req, res) => {
    res.json(artifacts.list());
  };

  const getArtifact: RequestHandler<RouteParams, Artifact | ErrorResponse> = (req, res) => {
    const artifact = artifacts.get(req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else {
      res.json(artifact);
    }
  };

  const upsertArtifact: RequestHandler<RouteParams, Artifact | ErrorResponse, UpsertArtifactPayload> = (req, res) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = artifacts.get(id);

    const runId = payload.runId ?? existing?.runId;
    const name = payload.name ?? existing?.name;
    const type = payload.type ?? existing?.type;
    const version = payload.version ?? existing?.version;
    const missingFields = Object.entries({ runId, name, type, version }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Artifact fields are required: ${missingFields.join(", ")}` });
    } else if (!runs.has(runId)) {
      res.status(400).json({ error: "Artifact runId does not reference an existing run" });
    } else {
      const artifact: Artifact = {
        id,
        runId,
        name,
        type,
        version,
        createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
        updatedAt: nowIso(),
        uri: payload.uri ?? existing?.uri,
        metadata: payload.metadata ?? existing?.metadata
      };

      artifacts.upsert(artifact);
      res.json(artifact);
    }
  };

  app.get(`${apiBase}/artifacts`, listArtifacts);
  app.get(`${apiBase}/artifacts/:id`, getArtifact);
  app.put(`${apiBase}/artifacts/:id`, upsertArtifact);
}
