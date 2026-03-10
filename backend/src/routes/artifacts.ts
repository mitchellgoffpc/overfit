import { API_BASE } from "@underfit/types";
import type { Artifact } from "@underfit/types";
import express from "express";

import type { Database } from "db";
import { getArtifact, listArtifacts, upsertArtifact } from "repositories/artifacts";
import { hasRun } from "repositories/runs";
import type { RouteApp, RouteHandler, RouteParams } from "routes/helpers";
import type { StorageBackend } from "storage";

type UpsertArtifactPayload = Partial<Omit<Artifact, "id" | "createdAt" | "updatedAt">>;
type UploadArtifactPayload = Buffer;

export function registerArtifactRoutes(app: RouteApp, db: Database, storage: StorageBackend | null): void {
  const listArtifactsHandler: RouteHandler<Record<string, string>, Artifact[]> = async (_req, res) => {
    res.json(await listArtifacts(db));
  };

  const getArtifactHandler: RouteHandler<RouteParams, Artifact> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else {
      res.json(artifact);
    }
  };

  const upsertArtifactHandler: RouteHandler<RouteParams, Artifact, UpsertArtifactPayload> = async (req, res) => {
    const id = req.params.id;
    const existing = await getArtifact(db, id);

    const runId = req.body.runId ?? existing?.runId;
    const name = req.body.name ?? existing?.name;
    const type = req.body.type ?? existing?.type;
    const version = req.body.version ?? existing?.version;
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
        uri: req.body.uri ?? existing?.uri ?? null,
        metadata: req.body.metadata ?? existing?.metadata ?? null
      });
      res.json(artifact);
    }
  };

  const uploadArtifactHandler: RouteHandler<RouteParams, Artifact, UploadArtifactPayload> = async (req, res) => {
    if (!storage) {
      res.status(404).json({ error: "Artifact uploads are disabled" });
      return;
    }

    const artifact = await getArtifact(db, req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
      return;
    }

    if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Artifact upload must include raw bytes" });
      return;
    }

    const artifactPath = await storage.writeArtifact(artifact.runId, artifact.id, req.body);
    const updated = await upsertArtifact(db, {
      ...artifact,
      uri: `file://${artifactPath}`
    });
    res.json(updated);
  };

  const downloadArtifactHandler: RouteHandler<RouteParams, Buffer> = async (req, res) => {
    if (!storage) {
      res.status(404).json({ error: "Artifact downloads are disabled" });
      return;
    }

    const artifact = await getArtifact(db, req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else {
      try {
        const content = await storage.readArtifact(artifact.runId, artifact.id);
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(content);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          res.status(404).json({ error: "Artifact file not found" });
        } else {
          throw error;
        }
      }
    }
  };

  app.get(`${API_BASE}/artifacts`, listArtifactsHandler);
  app.get(`${API_BASE}/artifacts/:id`, getArtifactHandler);
  app.put(`${API_BASE}/artifacts/:id`, upsertArtifactHandler);
  if (storage) {
    app.put(`${API_BASE}/artifacts/:id/file`, express.raw({ type: "*/*", limit: "250mb" }), uploadArtifactHandler);
    app.get(`${API_BASE}/artifacts/:id/file`, downloadArtifactHandler);
  }
}
