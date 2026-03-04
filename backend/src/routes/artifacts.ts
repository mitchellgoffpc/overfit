import type { Artifact, Run } from "@app/shared/models";
import type { Request, Response } from "express";

import type { ErrorResponse, ID, RouteApp } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerArtifactRoutes(app: RouteApp, apiBase: string, artifacts: EntityStore<Artifact>, runs: EntityStore<Run>): void {
  app.get(`${apiBase}/artifacts`, (_req: Request, res: Response<Artifact[]>) => {
    res.json(artifacts.list());
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

      for (const [label, value] of Object.entries({ runId })) {
        if (!value) {
          res.status(400).json({ error: `Artifact ${label} is required` });
          return;
        }
      }

      if (!runs.has(runId)) {
        res.status(400).json({ error: "Artifact runId does not reference an existing run" });
        return;
      }

      for (const [label, value] of Object.entries({ name, type, version })) {
        if (!value) {
          res.status(400).json({ error: `Artifact ${label} is required` });
          return;
        }
      }

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
  );
}
