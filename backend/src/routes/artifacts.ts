import { API_BASE } from "@underfit/types";
import type { Artifact, ID } from "@underfit/types";
import express from "express";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError, getJsonSizeError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { createArtifact, getArtifact, listArtifacts, updateArtifactUri } from "repositories/artifacts";
import { requireAuth } from "routes/auth";
import { getArtifactStorageKey } from "storage";
import type { StorageBackend } from "storage";

const CreateArtifactPayloadSchema = z.strictObject({
  runId: z.string(),
  name: z.string(),
  type: z.string(),
  version: z.string(),
  uri: z.string().nullable().exactOptional().prefault(null),
  metadata: z.record(z.string(), z.unknown()).nullable().exactOptional().prefault(null)
});
type CreateArtifactPayload = z.infer<typeof CreateArtifactPayloadSchema>;

export function registerArtifactRoutes(app: RouteApp, db: Database, storage: StorageBackend, metadataMaxBytes: number | null): void {
  const listArtifactsHandler: RouteHandler<Record<string, string>, Artifact[]> = async (_req, res) => {
    res.json(await listArtifacts(db));
  };

  const createArtifactHandler: RouteHandler<Record<string, string>, Artifact, CreateArtifactPayload> = async (req, res) => {
    const { success, error, data } = CreateArtifactPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }
    const metadataSizeError = getJsonSizeError("metadata", data.metadata, metadataMaxBytes);
    if (metadataSizeError) {
      res.status(400).json({ error: metadataSizeError });
      return;
    }

    const artifact = await createArtifact(db, data);
    if (!artifact) {
      res.status(400).json({ error: "Artifact runId does not reference an existing run" });
    } else {
      res.json(artifact);
    }
  };

  const getArtifactHandler: RouteHandler<{ id: ID }, Artifact> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else {
      res.json(artifact);
    }
  };

  const uploadArtifactHandler: RouteHandler<{ id: ID }, Artifact, Buffer> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);
    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Artifact upload must include raw bytes" });
    } else {
      const artifactPath = await storage.write(getArtifactStorageKey(artifact.runId, artifact.id), req.body);
      const updated = await updateArtifactUri(db, artifact.id, `file://${artifactPath}`);
      if (!updated) {
        res.status(404).json({ error: "Artifact not found" });
      } else {
        res.json(updated);
      }
    }
  };

  const downloadArtifactHandler: RouteHandler<{ id: ID }, Buffer> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);

    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else {
      try {
        const content = await storage.read(getArtifactStorageKey(artifact.runId, artifact.id));
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
  app.put(`${API_BASE}/artifacts`, requireAuth(db), createArtifactHandler);
  app.get(`${API_BASE}/artifacts/:id`, getArtifactHandler);
  app.put(`${API_BASE}/artifacts/:id/file`, requireAuth(db), express.raw({ type: "*/*", limit: "250mb" }), uploadArtifactHandler);
  app.get(`${API_BASE}/artifacts/:id/file`, downloadArtifactHandler);
}
