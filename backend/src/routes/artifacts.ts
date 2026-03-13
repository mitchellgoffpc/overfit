import { API_BASE } from "@underfit/types";
import type { Artifact } from "@underfit/types";
import express from "express";
import { z } from "zod";

import type { Database } from "db";
import { getArtifact, listArtifacts, upsertArtifact } from "repositories/artifacts";
import { hasRun } from "repositories/runs";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler, RouteParams } from "routes/helpers";
import { getArtifactStorageKey } from "storage";
import type { StorageBackend } from "storage";

const UpsertArtifactPayloadSchema = z.strictObject({
  runId: z.string().optional(),
  name: z.string().optional(),
  type: z.string().optional(),
  version: z.string().optional(),
  uri: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional()
});
type UpsertArtifactPayload = z.infer<typeof UpsertArtifactPayloadSchema>;

export function registerArtifactRoutes(app: RouteApp, db: Database, storage: StorageBackend): void {
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
    const { success, error, data = {} } = UpsertArtifactPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const id = req.params.id;
    const existing = await getArtifact(db, id) ?? {};
    const merged = { ...existing, ...data, id };

    const missingFields = ["runId", "name", "type", "version"].filter((field) => !merged[field as keyof typeof merged]);
    if (missingFields.length > 0) {
      res.status(400).json({ error: `Artifact fields are required: ${missingFields.join(", ")}` });
    } else if (!await hasRun(db, merged.runId)) {
      res.status(400).json({ error: "Artifact runId does not reference an existing run" });
    } else {
      res.json(await upsertArtifact(db, merged));
    }
  };

  const uploadArtifactHandler: RouteHandler<RouteParams, Artifact, Buffer> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);
    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Artifact upload must include raw bytes" });
    } else {
      const artifactPath = await storage.write(getArtifactStorageKey(artifact.runId, artifact.id), req.body);
      const updated = await upsertArtifact(db, {
        ...artifact,
        uri: `file://${artifactPath}`
      });
      res.json(updated);
    }
  };

  const downloadArtifactHandler: RouteHandler<RouteParams, Buffer> = async (req, res) => {
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
  app.get(`${API_BASE}/artifacts/:id`, getArtifactHandler);
  app.put(`${API_BASE}/artifacts/:id`, upsertArtifactHandler);
  app.put(`${API_BASE}/artifacts/:id/file`, express.raw({ type: "*/*", limit: "250mb" }), uploadArtifactHandler);
  app.get(`${API_BASE}/artifacts/:id/file`, downloadArtifactHandler);
}
