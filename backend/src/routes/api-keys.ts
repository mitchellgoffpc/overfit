import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { ApiKey, ApiKeyWithToken } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError } from "helpers";
import type { Empty, RouteApp, RouteHandler } from "helpers";
import { createApiKey, deleteApiKey, listApiKeys } from "repositories/api-keys";
import { requireAuth } from "routes/auth";

const ApiKeyPayloadSchema = z.strictObject({
  label: z.string().trim().min(1).nullable().exactOptional().prefault(null)
});

type ApiKeyPayload = z.infer<typeof ApiKeyPayloadSchema>;

export function registerApiKeyRoutes(app: RouteApp, db: Database): void {
  const listApiKeysHandler: RouteHandler<Empty, ApiKey[]> = async (req, res) => {
    res.json(await listApiKeys(db, req.user.id));
  };

  const createApiKeyHandler: RouteHandler<Empty, ApiKeyWithToken, ApiKeyPayload> = async (req, res) => {
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
