import { API_BASE } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import { getRun } from "repositories/runs";
import type { FileEntry, StorageBackend } from "storage";

const ListFilesQuerySchema = z.object({
  path: z.string().optional()
});

export function registerFileRoutes(app: RouteApp, db: Database, storage: StorageBackend): void {
  const listFilesHandler: RouteHandler<{ handle: string; projectName: string; runName: string }, FileEntry[]> = async (req, res) => {
    const query = ListFilesQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: formatZodError(query.error) });
      return;
    }
    const run = await getRun(db, req.params.handle.trim().toLowerCase(), req.params.projectName.trim().toLowerCase(), req.params.runName.trim().toLowerCase());
    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    const subPath = query.data.path ?? "";
    const prefix = subPath ? `${run.id}/${subPath}` : run.id;
    res.json(await storage.list(prefix));
  };

  const base = `${API_BASE}/accounts/:handle/projects/:projectName/runs/:runName/files`;
  app.get(base, listFilesHandler);
}
