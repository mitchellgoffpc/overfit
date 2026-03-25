import { API_BASE } from "@underfit/types";
import type { Artifact, ID } from "@underfit/types";
import express from "express";
import { z } from "zod";

import type { Database } from "db";
import { checkJsonSize, formatZodError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { createArtifact, finalizeArtifact, getArtifact, incrementArtifactUploadedFileCount, listProjectArtifacts } from "repositories/artifacts";
import { getProject } from "repositories/projects";
import { requireAuth } from "routes/auth";
import { getArtifactFileStorageKey, getArtifactManifestStorageKey, getArtifactUploadMarkerStorageKey } from "storage/index";
import type { StorageBackend } from "storage/index";

const isValidArtifactPath = (value: string): boolean => {
  if (value.includes("\0") || value.startsWith("/") || value.startsWith("\\")) {
    return false;
  }
  const segments = value.split("/").filter(Boolean);
  return !!segments[0] && !segments.some((segment) => segment === "." || segment === "..");
};

const ArtifactManifestFileSchema = z.strictObject({
  path: z.string().min(1).transform((value) => value.replaceAll("\\", "/")).refine(isValidArtifactPath, { message: "Invalid artifact path" }),
  size: z.number().int().nonnegative().nullable().exactOptional().prefault(null),
  sha256: z.string().min(1).nullable().exactOptional().prefault(null)
});

const ArtifactManifestSchema = z.strictObject({
  files: z.array(ArtifactManifestFileSchema),
  references: z.array(z.url()).exactOptional().prefault([])
}).superRefine(checkJsonSize);

const CreateArtifactPayloadSchema = z.strictObject({
  runId: z.string().nullable().exactOptional().prefault(null),
  step: z.number().int().nullable().exactOptional().prefault(null),
  name: z.string(),
  type: z.string(),
  metadata: z.record(z.string(), z.unknown()).superRefine(checkJsonSize).nullable().exactOptional().prefault(null),
  manifest: ArtifactManifestSchema
}).superRefine((value, ctx) => {
  if (value.step !== null && value.runId === null) {
    ctx.addIssue({ code: "custom", path: ["step"], message: "step requires runId" });
  }
});

type CreateArtifactPayload = z.infer<typeof CreateArtifactPayloadSchema>;
type ArtifactManifest = z.infer<typeof ArtifactManifestSchema>;

const normalizeArtifactPath = (value: string): string | undefined => {
  const normalizedValue = value.replaceAll("\\", "/");
  return isValidArtifactPath(normalizedValue) ? normalizedValue.split("/").filter(Boolean).join('/') : undefined;
};

export function registerArtifactRoutes(app: RouteApp, db: Database, storage: StorageBackend): void {
  const listArtifactsHandler: RouteHandler<{ handle: string; projectName: string }, Artifact[]> = async (req, res) => {
    const project = await getProject(db, req.params.handle.trim().toLowerCase(), req.params.projectName.trim().toLowerCase());
    if (!project) {
      res.status(404).json({ error: "Project not found" });
    } else {
      res.json(await listProjectArtifacts(db, project.id));
    }
  };

  const createArtifactHandler: RouteHandler<{ handle: string; projectName: string }, Artifact, CreateArtifactPayload> = async (req, res) => {
    const { success, error, data } = CreateArtifactPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }
    const project = await getProject(db, req.params.handle.trim().toLowerCase(), req.params.projectName.trim().toLowerCase());
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    const { manifest, ...payload } = data;
    const files = new Map(manifest.files.map((file) => [file.path, file]));
    const dedupedManifest = { files: [...files.values()], references: [...new Set(manifest.references)] };
    const artifact = await createArtifact(db, { projectId: project.id, declaredFileCount: dedupedManifest.files.length, ...payload });
    if (!artifact) {
      res.status(400).json({ error: "Artifact could not be created" });
    } else {
      const manifestStorageKey = getArtifactManifestStorageKey(artifact.storageKey);
      await storage.write(manifestStorageKey, Buffer.from(JSON.stringify(dedupedManifest), "utf8"));
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

  const uploadArtifactFileHandler: RouteHandler<{ id: ID; filePath: string | string[] }, Artifact, Buffer> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);
    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else if (artifact.status !== "open") {
      res.status(409).json({ error: "Artifact is finalized and no longer accepts writes" });
    } else if (!Buffer.isBuffer(req.body)) {
      res.status(400).json({ error: "Artifact upload must include raw bytes" });
    } else {
      const filePath = Array.isArray(req.params.filePath) ? req.params.filePath.join("/") : req.params.filePath;
      const normalizedPath = normalizeArtifactPath(filePath);
      if (!normalizedPath) { res.status(400).json({ error: "Invalid artifact file path" }); return; }

      const manifestRead = await storage.safeRead(getArtifactManifestStorageKey(artifact.storageKey));
      if (!manifestRead.ok) { res.status(500).json({ error: "Artifact manifest not found" }); return; }
      let manifest: ArtifactManifest;
      try {
        manifest = JSON.parse(manifestRead.data.toString("utf8")) as ArtifactManifest;
      } catch {
        res.status(500).json({ error: "Artifact manifest is invalid JSON" });
        return;
      }
      if (!manifest.files.some((entry) => entry.path === normalizedPath)) {
        res.status(400).json({ error: `File path ${normalizedPath} is not declared in manifest` });
        return;
      }

      await storage.write(getArtifactFileStorageKey(artifact.storageKey, normalizedPath), req.body);
      const markerStorageKey = getArtifactUploadMarkerStorageKey(artifact.storageKey, normalizedPath);
      if ((await storage.safeRead(markerStorageKey)).ok) { res.json(artifact); return; }
      await storage.write(markerStorageKey, Buffer.alloc(0));
      const updated = await incrementArtifactUploadedFileCount(db, artifact.id);
      if (!updated) { res.status(409).json({ error: "Artifact is finalized and no longer accepts writes" }); return; }
      res.json(updated);
    }
  };

  const downloadArtifactFileHandler: RouteHandler<{ id: ID; filePath: string | string[] }, Buffer> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);
    const filePath = Array.isArray(req.params.filePath) ? req.params.filePath.join("/") : req.params.filePath;
    const normalizedPath = normalizeArtifactPath(filePath);
    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else if (!normalizedPath) {
      res.status(400).json({ error: "Invalid artifact file path" });
    } else {
      const result = await storage.safeRead(getArtifactFileStorageKey(artifact.storageKey, normalizedPath));
      if (!result.ok) {
        res.status(404).json({ error: "Artifact file not found" });
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(result.data);
      }
    }
  };

  const finalizeArtifactHandler: RouteHandler<{ id: ID }, { success: true }> = async (req, res) => {
    const artifact = await getArtifact(db, req.params.id);
    if (!artifact) {
      res.status(404).json({ error: "Artifact not found" });
    } else if (artifact.uploadedFileCount < artifact.declaredFileCount) {
      res.status(409).json({ error: "Artifact cannot be finalized because some files are missing" }); return;
    } else {
      await finalizeArtifact(db, artifact.id);
      res.json({ success: true });
    }
  };

  const base = `${API_BASE}/accounts/:handle/projects/:projectName/artifacts`;
  app.get(base, listArtifactsHandler);
  app.post(base, requireAuth(db), createArtifactHandler);
  app.get(`${API_BASE}/artifacts/:id`, getArtifactHandler);
  app.put(`${API_BASE}/artifacts/:id/files/*filePath`, requireAuth(db), express.raw({ type: "*/*", limit: "250mb" }), uploadArtifactFileHandler);
  app.get(`${API_BASE}/artifacts/:id/files/*filePath`, downloadArtifactFileHandler);
  app.post(`${API_BASE}/artifacts/:id/finalize`, requireAuth(db), finalizeArtifactHandler);
}
