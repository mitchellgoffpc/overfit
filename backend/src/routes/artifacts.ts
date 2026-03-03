import type { Artifact, Run } from "@app/shared";
import type { Request, Response } from "express";


import { nowIso } from "./helpers";
import type { ErrorResponse, ID, RouteApp } from "./helpers";

type ArtifactStore = Map<ID, Artifact>;

type RunStore = Map<ID, Run>;

export function registerArtifactRoutes(
  app: RouteApp,
  apiBase: string,
  artifacts: ArtifactStore,
  runs: RunStore
): void {
  app.get(`${apiBase}/artifacts`, (_req: Request, res: Response<Artifact[]>) => {
    res.json(Array.from(artifacts.values()));
  });

  app.get(`${apiBase}/artifacts/:id`, (req: Request<{ id: ID }>, res: Response<Artifact | ErrorResponse>) => {
    const artifact = artifacts.get(req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    res.json(artifact);
  });

  app.put(
    `${apiBase}/artifacts/:id`,
    (req: Request<{ id: ID }, Artifact | ErrorResponse, Partial<Artifact>>, res: Response<Artifact | ErrorResponse>) => {
      const id = req.params.id;
      const payload = req.body;
      const existing = artifacts.get(id);

      const runId = payload.runId ?? existing?.runId;
      const name = payload.name ?? existing?.name;
      const type = payload.type ?? existing?.type;
      const version = payload.version ?? existing?.version;

      if (!runId) {
        res.status(400).json({ error: "Artifact runId is required" });
        return;
      }

      if (!runs.has(runId)) {
        res.status(400).json({ error: "Artifact runId does not reference an existing run" });
        return;
      }

      if (!name) {
        res.status(400).json({ error: "Artifact name is required" });
        return;
      }

      if (!type) {
        res.status(400).json({ error: "Artifact type is required" });
        return;
      }

      if (!version) {
        res.status(400).json({ error: "Artifact version is required" });
        return;
      }

      const createdAt = existing?.createdAt ?? payload.createdAt ?? nowIso();

      const artifact: Artifact = {
        id,
        runId,
        name,
        type,
        version,
        createdAt,
        updatedAt: nowIso(),
        uri: payload.uri ?? existing?.uri,
        metadata: payload.metadata ?? existing?.metadata
      };

      artifacts.set(id, artifact);
      res.json(artifact);
    }
  );
}
