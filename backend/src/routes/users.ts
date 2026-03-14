import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { ApiKey, Organization, OrganizationRole, User } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { createApiKey, deleteApiKey, listApiKeysByUser } from "repositories/api-keys";
import { listOrganizationMembershipsByUserId } from "repositories/organization-members";
import { getUserByEmail, getUserByHandle, updateUser } from "repositories/users";
import { requireAuth } from "routes/auth";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const EmailExistsQuerySchema = z.strictObject({
  email: z.string().trim().min(1, "Email is required").prefault("")
});
const UpdateProfilePayloadSchema = z.strictObject({
  name: z.string().trim().min(1).exactOptional(),
  bio: z.string().trim().min(1).exactOptional()
});
const ApiKeyPayloadSchema = z.strictObject({
  label: z.string().trim().min(1).exactOptional()
});

type EmailExistsQuery = z.infer<typeof EmailExistsQuerySchema>;
type UpdateProfilePayload = z.infer<typeof UpdateProfilePayloadSchema>;
type ApiKeyPayload = z.infer<typeof ApiKeyPayloadSchema>;
type UserMembershipsResponse = (Organization & { role: OrganizationRole })[];

export function registerUserRoutes(app: RouteApp, db: Database): void {
  const emailExistsHandler: RouteHandler<Record<string, string>, { exists: boolean }, undefined, EmailExistsQuery> = async (req, res) => {
    const { success, error, data } = EmailExistsQuerySchema.safeParse(req.query);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else {
      res.json({ exists: Boolean(await getUserByEmail(db, data.email)) });
    }
  };

  const listUserMembershipsHandler: RouteHandler<{ handle: string }, UserMembershipsResponse> = async (req, res) => {
    const user = await getUserByHandle(db, req.params.handle.trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(await listOrganizationMembershipsByUserId(db, user.id));
    }
  };

  const redirectUserMembershipHandler: RouteHandler<{ handle: string; organizationHandle: string }, unknown> = (req, res) => {
    res.redirect(307, `${API_BASE}/organizations/${req.params.organizationHandle}/members/${req.params.handle}`);
  };

  const updateProfileHandler: RouteHandler<Record<string, string>, User, UpdateProfilePayload> = async (req, res) => {
    const { success, error, data } = UpdateProfilePayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }
    res.json(await updateUser(db, req.user.id, data));
  };

  const getCurrentUserHandler: RouteHandler<Record<string, string>, User> = (req, res) => {
    res.json(req.user);
  };

  const listApiKeysHandler: RouteHandler<Record<string, string>, ApiKey[]> = async (req, res) => {
    res.json(await listApiKeysByUser(db, req.user.id));
  };

  const createApiKeyHandler: RouteHandler<Record<string, string>, ApiKey, ApiKeyPayload> = async (req, res) => {
    const { success, error, data } = ApiKeyPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const key = await createApiKey(db, {
      id: randomBytes(12).toString("hex"),
      userId: req.user.id,
      label: data.label ?? null,
      token: randomBytes(24).toString("base64url")
    });
    res.json(key);
  };

  const deleteApiKeyHandler: RouteHandler<{ id: string }, { status: "ok" }> = async (req, res) => {
    await deleteApiKey(db, req.params.id, req.user.id);
    res.json({ status: "ok" });
  };

  app.get(`${API_BASE}/emails/exists`, emailExistsHandler);
  app.get(`${API_BASE}/me`, requireAuth(db), getCurrentUserHandler);
  app.patch(`${API_BASE}/me`, requireAuth(db), updateProfileHandler);
  app.get(`${API_BASE}/me/api-keys`, requireAuth(db), listApiKeysHandler);
  app.post(`${API_BASE}/me/api-keys`, requireAuth(db), createApiKeyHandler);
  app.delete(`${API_BASE}/me/api-keys/:id`, requireAuth(db), deleteApiKeyHandler);
  app.get(`${API_BASE}/users/:handle/memberships`, listUserMembershipsHandler);
  app.put(`${API_BASE}/users/:handle/memberships/:organizationHandle`, redirectUserMembershipHandler);
  app.delete(`${API_BASE}/users/:handle/memberships/:organizationHandle`, redirectUserMembershipHandler);
}
