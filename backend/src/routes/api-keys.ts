import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { ApiKey } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { createApiKey, deleteApiKey, listApiKeysByUser } from "repositories/api-keys";
import { requireAuth } from "routes/auth";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const ApiKeyPayloadSchema = z.strictObject({
  label: z.string().trim().min(1).nullable().exactOptional().prefault(null)
});

type ApiKeyPayload = z.infer<typeof ApiKeyPayloadSchema>;

export function registerApiKeyRoutes(app: RouteApp, db: Database): void {
  const listApiKeysHandler: RouteHandler<Record<string, string>, ApiKey[]> = async (req, res) => {
    res.json(await listApiKeysByUser(db, req.user.id));
  };

  const createApiKeyHandler: RouteHandler<Record<string, string>, ApiKey, ApiKeyPayload> = async (req, res) => {
    const { success, error, data } = ApiKeyPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else {
      res.json(await createApiKey(db, { userId: req.user.id, label: data.label, token: randomBytes(24).toString("base64url") }));
    }
  };

  const deleteApiKeyHandler: RouteHandler<{ id: string }, { status: "ok" }> = async (req, res) => {
    await deleteApiKey(db, req.params.id, req.user.id);
    res.json({ status: "ok" });
  };

  app.get(`${API_BASE}/me/api-keys`, requireAuth(db), listApiKeysHandler);
  app.post(`${API_BASE}/me/api-keys`, requireAuth(db), createApiKeyHandler);
  app.delete(`${API_BASE}/me/api-keys/:id`, requireAuth(db), deleteApiKeyHandler);
}
