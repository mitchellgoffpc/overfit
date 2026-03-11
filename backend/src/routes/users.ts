import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { ApiKey, Organization, OrganizationRole, User } from "@underfit/types";

import type { Database } from "db";
import { createApiKey, deleteApiKey, listApiKeysByUser } from "repositories/api-keys.js";
import { listOrganizationMembershipsByUserId } from "repositories/organization-members";
import { getUserByEmail, getUserByHandle, updateUserProfile } from "repositories/users";
import { requireAuth } from "routes/auth";
import type { RouteApp, RouteHandler } from "routes/helpers";

interface EmailExistsQuery { email?: string }
interface ExistsResponse { exists: boolean }
type UserMembershipsResponse = (Organization & { role: OrganizationRole })[];
interface UpdateProfilePayload { name?: string; bio?: string }
interface ApiKeyPayload { label?: string }
interface StatusResponse { status: "ok" }

export function registerUserRoutes(app: RouteApp, db: Database): void {
  const emailExistsHandler: RouteHandler<Record<string, string>, ExistsResponse, undefined, EmailExistsQuery> = async (req, res) => {
    const email = req.query.email?.trim() ?? "";
    if (!email) {
      res.status(400).json({ error: "Email is required" });
    } else {
      res.json({ exists: Boolean(await getUserByEmail(db, email)) });
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
    const nameInput = typeof req.body.name === "string" ? req.body.name.trim() : undefined;
    const bioInput = typeof req.body.bio === "string" ? req.body.bio.trim() : undefined;
    const updates: { name?: string | null; bio?: string | null; displayName?: string } = {};

    if (nameInput !== undefined) {
      updates.name = nameInput.length > 0 ? nameInput : null;
      if (updates.name) { updates.displayName = updates.name; }
    }
    if (bioInput !== undefined) { updates.bio = bioInput.length > 0 ? bioInput : null; }

    if (Object.keys(updates).length === 0) {
      res.json(req.user);
      return;
    }

    const updated = await updateUserProfile(db, req.user.id, updates);
    if (!updated) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(updated);
    }
  };

  const getCurrentUserHandler: RouteHandler<Record<string, string>, User> = (req, res) => {
    res.json(req.user);
  };

  const listApiKeysHandler: RouteHandler<Record<string, string>, ApiKey[]> = async (req, res) => {
    res.json(await listApiKeysByUser(db, req.user.id));
  };

  const createApiKeyHandler: RouteHandler<Record<string, string>, ApiKey, ApiKeyPayload> = async (req, res) => {
    const rawLabel = typeof req.body.label === "string" ? req.body.label.trim() : "";
    const key = await createApiKey(db, {
      id: randomBytes(12).toString("hex"),
      userId: req.user.id,
      label: rawLabel.length > 0 ? rawLabel : null,
      token: randomBytes(24).toString("base64url")
    });
    res.json(key);
  };

  const deleteApiKeyHandler: RouteHandler<{ id: string }, StatusResponse> = async (req, res) => {
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
