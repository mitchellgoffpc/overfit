import type { Artifact, Run } from "@overfit/types";

import type { ErrorResponse, RouteApp, RouteParams, RouteRequest, RouteResponse, UpsertArtifactPayload } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerArtifactRoutes(app: RouteApp, apiBase: string, artifacts: EntityStore<Artifact>, runs: EntityStore<Run>): void {
  app.get(`${apiBase}/artifacts`, (_req: RouteRequest, res: RouteResponse<Artifact[]>) => {
    res.json(artifacts.list());
  });

  app.get(`${apiBase}/artifacts/:id`, (req: RouteRequest<RouteParams>, res: RouteResponse<Artifact | ErrorResponse>) => {
    const artifact = artifacts.get(req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    res.json(artifact);
  });

  app.put(
    `${apiBase}/artifacts/:id`,
    (req: RouteRequest<RouteParams, Artifact | ErrorResponse, UpsertArtifactPayload>, res: RouteResponse<Artifact | ErrorResponse>) => {
      const id = req.params.id;
      const payload = req.body;
      const existing = artifacts.get(id);

      const runId = payload.runId ?? existing?.runId;
      const name = payload.name ?? existing?.name;
      const type = payload.type ?? existing?.type;
      const version = payload.version ?? existing?.version;

      for (const [label, value] of Object.entries({ runId, name, type, version })) {
        if (!value) {
          res.status(400).json({ error: `Artifact ${label} is required` });
          return;
        }
      }

      if (!runs.has(runId)) {
        res.status(400).json({ error: "Artifact runId does not reference an existing run" });
        return;
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
