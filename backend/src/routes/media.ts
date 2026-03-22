import { randomBytes } from "crypto";

import { API_BASE, mediaTypes } from "@underfit/types";
import type { ID, Media } from "@underfit/types";
import express from "express";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError, jsonObject } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { createMedia, getMedia, listMedia } from "repositories/media";
import { getRun } from "repositories/runs";
import { requireAuth } from "routes/auth";
import { getMediaStorageKey } from "storage";
import type { StorageBackend } from "storage";

const CreateMediaQuerySchema = z.object({
  key: z.string().min(1),
  step: z.coerce.number().int().nullable().exactOptional().prefault(null),
  type: z.enum(mediaTypes),
  metadata: jsonObject().nullable().exactOptional().prefault(null),
});

const ListMediaQuerySchema = z.object({
  key: z.string().min(1).optional(),
  step: z.coerce.number().int().optional()
});

export function registerMediaRoutes(app: RouteApp, db: Database, storage: StorageBackend): void {
  const getPathRun = async (params: { handle: string; projectName: string; runName: string }) => {
    return await getRun(db, params.handle.trim().toLowerCase(), params.projectName.trim().toLowerCase(), params.runName.trim().toLowerCase());
  };

  const createMediaHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Media, Buffer> = async (req, res) => {
    const query = CreateMediaQuerySchema.safeParse(req.query);
    const run = await getPathRun(req.params);
    if (!query.success) {
      res.status(400).json({ error: formatZodError(query.error) });
    } else if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      res.status(400).json({ error: "Request body must contain file data" });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      const id = randomBytes(16).toString("hex");
      const storageKey = await storage.write(getMediaStorageKey(run.id, id), req.body);
      const media = await createMedia(db, {
        id, runId: run.id, key: query.data.key, step: query.data.step, type: query.data.type, storageKey, metadata: query.data.metadata
      });
      if (!media) {
        res.status(400).json({ error: "Failed to create media" });
      } else {
        res.json(media);
      }
    }
  };

  const listMediaHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Media[]> = async (req, res) => {
    const query = ListMediaQuerySchema.safeParse(req.query);
    const run = await getPathRun(req.params);
    if (!query.success) {
      res.status(400).json({ error: formatZodError(query.error) });
    } else if (!run) {
      res.status(404).json({ error: "Run not found" });
    } else {
      res.json(await listMedia(db, run.id, query.data.key, query.data.step));
    }
  };

  const downloadMediaHandler: RouteHandler<{ id: ID }, Buffer> = async (req, res) => {
    const media = await getMedia(db, req.params.id);
    if (!media) {
      res.status(404).json({ error: "Media not found" });
    } else {
      const result = await storage.safeRead(media.storageKey);
      if (!result.ok) {
        res.status(404).json({ error: "Media file not found" });
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(result.data);
      }
    }
  };

  const base = `${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/media`;
  app.post(base, requireAuth(db), express.raw({ type: "*/*", limit: "250mb" }), createMediaHandler);
  app.get(base, listMediaHandler);
  app.get(`${base}/:id/file`, downloadMediaHandler);
}
