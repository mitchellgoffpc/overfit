import { randomBytes } from "crypto";

import { API_BASE, mediaTypes } from "@underfit/types";
import type { ID, Media } from "@underfit/types";
import express from "express";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError, getJsonSizeError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { createMedia, getMedia, listMedia } from "repositories/media";
import { getRun } from "repositories/runs";
import { requireAuth } from "routes/auth";
import { getMediaStorageKey } from "storage";
import type { StorageBackend } from "storage";

const CreateMediaQuerySchema = z.object({
  key: z.string().min(1),
  step: z.coerce.number().int().optional(),
  type: z.enum(mediaTypes),
  metadata: z.string().optional()
});

const ListMediaQuerySchema = z.object({
  key: z.string().min(1).optional(),
  step: z.coerce.number().int().optional()
});

export function registerMediaRoutes(app: RouteApp, db: Database, storage: StorageBackend, metadataMaxBytes: number | null): void {
  const getPathRun = async (params: { handle: string; projectName: string; runName: string }) => {
    return await getRun(db, params.handle.trim().toLowerCase(), params.projectName.trim().toLowerCase(), params.runName.trim().toLowerCase());
  };

  const createMediaHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Media, Buffer> = async (req, res) => {
    const query = CreateMediaQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: formatZodError(query.error) });
      return;
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Request body must contain file data" });
      return;
    }

    let metadata: Record<string, unknown> | null = null;
    if (query.data.metadata) {
      try {
        metadata = JSON.parse(query.data.metadata) as Record<string, unknown>;
      } catch {
        res.status(400).json({ error: "metadata: Invalid JSON" });
        return;
      }
    }
    const metadataSizeError = getJsonSizeError("metadata", metadata, metadataMaxBytes);
    if (metadataSizeError) {
      res.status(400).json({ error: metadataSizeError });
      return;
    }

    const run = await getPathRun(req.params);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const id = randomBytes(16).toString("hex");
    const storageKey = await storage.write(getMediaStorageKey(run.id, id), req.body);
    const media = await createMedia(db, {
      id, runId: run.id, key: query.data.key, step: query.data.step ?? null, type: query.data.type, storageKey, metadata
    });
    if (!media) {
      res.status(400).json({ error: "Failed to create media" });
    } else {
      res.json(media);
    }
  };

  const listMediaHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Media[]> = async (req, res) => {
    const query = ListMediaQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: formatZodError(query.error) });
      return;
    }
    const run = await getPathRun(req.params);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.json(await listMedia(db, run.id, query.data.key, query.data.step));
  };

  const downloadMediaHandler: RouteHandler<{ id: ID }, Buffer> = async (req, res) => {
    const media = await getMedia(db, req.params.id);
    if (!media) {
      res.status(404).json({ error: "Media not found" });
    } else {
      try {
        const content = await storage.read(media.storageKey);
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(content);
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          res.status(404).json({ error: "Media file not found" });
        } else {
          throw error;
        }
      }
    }
  };

  const base = `${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/media`;
  app.post(base, requireAuth(db), express.raw({ type: "*/*", limit: "250mb" }), createMediaHandler);
  app.get(base, listMediaHandler);
  app.get(`${base}/:id/file`, downloadMediaHandler);
}
