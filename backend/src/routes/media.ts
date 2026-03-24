import { randomBytes } from "crypto";

import { API_BASE, mediaTypes } from "@underfit/types";
import type { ID, Media } from "@underfit/types";
import multer from "multer";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError, jsonObject } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { createMedia, getMedia, listMedia } from "repositories/media";
import { getRun } from "repositories/runs";
import { requireAuth } from "routes/auth";
import { getMediaStorageKey } from "storage/index";
import type { StorageBackend } from "storage/index";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 250 * 1024 * 1024 } });

const CreateMediaMetadataSchema = z.strictObject({
  key: z.string().min(1),
  step: z.number().int().nullable().exactOptional().prefault(null),
  type: z.enum(mediaTypes),
  metadata: z.record(z.string(), z.unknown()).nullable().exactOptional().prefault(null)
});

const ListMediaQuerySchema = z.object({
  key: z.string().min(1).optional(),
  step: z.coerce.number().int().optional()
});

const DownloadMediaQuerySchema = z.object({
  index: z.coerce.number().int().min(0).optional()
});

export function registerMediaRoutes(app: RouteApp, db: Database, storage: StorageBackend): void {
  const getPathRun = async (params: { handle: string; projectName: string; runName: string }) => {
    return await getRun(db, params.handle.trim().toLowerCase(), params.projectName.trim().toLowerCase(), params.runName.trim().toLowerCase());
  };

  const createMediaHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, Media> = async (req, res) => {
    const files = req.files as { buffer: Buffer }[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "At least one file is required" });
      return;
    }
    const metaField = (req.body as Record<string, string>)["metadata"];
    if (!metaField) {
      res.status(400).json({ error: "A metadata field is required" });
      return;
    }
    const parsed = jsonObject().safeParse(metaField);
    if (!parsed.success) {
      res.status(400).json({ error: `metadata: ${formatZodError(parsed.error)}` });
      return;
    }
    const meta = CreateMediaMetadataSchema.safeParse(parsed.data);
    if (!meta.success) {
      res.status(400).json({ error: formatZodError(meta.error) });
      return;
    }

    const run = await getPathRun(req.params);
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const id = randomBytes(16).toString("hex");
    const storageKey = `${run.id}/media/${id}`;
    await Promise.all(files.map(async (file, i) => storage.write(getMediaStorageKey(run.id, id, i), file.buffer)));

    const media = await createMedia(db, {
      id, runId: run.id, key: meta.data.key, step: meta.data.step, type: meta.data.type,
      storageKey, count: files.length, metadata: meta.data.metadata
    });
    if (!media) {
      res.status(400).json({ error: "Failed to create media" });
    } else {
      res.json(media);
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
    const query = DownloadMediaQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: formatZodError(query.error) });
      return;
    }
    const index = query.data.index ?? 0;
    const media = await getMedia(db, req.params.id);
    if (!media) {
      res.status(404).json({ error: "Media not found" });
    } else if (index >= media.count) {
      res.status(400).json({ error: `Index ${String(index)} out of range (count: ${String(media.count)})` });
    } else {
      const result = await storage.safeRead(getMediaStorageKey(media.runId, media.id, index));
      if (!result.ok) {
        res.status(404).json({ error: "Media file not found" });
      } else {
        res.setHeader("Content-Type", "application/octet-stream");
        res.send(result.data);
      }
    }
  };

  const base = `${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/media`;
  app.post(base, requireAuth(db), upload.array("files"), createMediaHandler);
  app.get(base, listMediaHandler);
  app.get(`${base}/:id/file`, downloadMediaHandler);
}
