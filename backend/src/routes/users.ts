import { randomBytes } from "crypto";

import { API_BASE } from "@underfit/types";
import type { ApiKey, Organization, OrganizationRole, Run, User } from "@underfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { createApiKey, deleteApiKey, listApiKeysByUser } from "repositories/api-keys.js";
import { listOrganizationMembershipsByUserId } from "repositories/organization-members";
import { listRunsByUser } from "repositories/runs";
import { getUser, getUserByEmail, updateUserProfile } from "repositories/users";
import { requireAuth } from "routes/auth";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

interface EmailExistsQuery { email?: string }
interface ExistsResponse { exists: boolean }
type UserMembershipsResponse = (Organization & { role: OrganizationRole })[];
interface UpdateProfilePayload { name?: string; bio?: string }
interface ApiKeyPayload { label?: string }
interface StatusResponse { status: "ok" }

export function registerUserRoutes(app: RouteApp, db: Database): void {
  const emailExistsHandler: RequestHandler<Record<string, string>, ExistsResponse | ErrorResponse, undefined, EmailExistsQuery> = async (req, res) => {
    const email = req.query.email?.trim() ?? "";
    if (!email) {
      res.status(400).json({ error: "Email is required" });
    } else {
      res.json({ exists: Boolean(await getUserByEmail(db, email)) });
    }
  };

  const getUserHandler: RequestHandler<RouteParams, User | ErrorResponse> = async (req, res) => {
    const user = await getUser(db, req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(user);
    }
  };

  const listUserMembershipsHandler: RequestHandler<RouteParams, UserMembershipsResponse | ErrorResponse> = async (req, res) => {
    const user = await getUser(db, req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(await listOrganizationMembershipsByUserId(db, user.id));
    }
  };

  const listUserRunsHandler: RequestHandler<RouteParams, Run[] | ErrorResponse> = async (req, res) => {
    const user = await getUser(db, req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(await listRunsByUser(db, user.id));
    }
  };

  const redirectUserMembershipHandler: RequestHandler<{ id: string; organizationId: string }> = (req, res) => {
    res.redirect(307, `${API_BASE}/organizations/${req.params.organizationId}/members/${req.params.id}`);
  };

  const updateProfileHandler: RequestHandler<Record<string, string>, User | ErrorResponse, UpdateProfilePayload | undefined> = async (req, res) => {
    const nameInput = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
    const bioInput = typeof req.body?.bio === "string" ? req.body.bio.trim() : undefined;
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

  const listApiKeysHandler: RequestHandler<Record<string, string>, ApiKey[] | ErrorResponse> = async (req, res) => {
    res.json(await listApiKeysByUser(db, req.user.id));
  };

  const createApiKeyHandler: RequestHandler<Record<string, string>, ApiKey | ErrorResponse, ApiKeyPayload | undefined> = async (req, res) => {
    const rawLabel = typeof req.body?.label === "string" ? req.body.label.trim() : "";
    const key = await createApiKey(db, {
      id: randomBytes(12).toString("hex"),
      userId: req.user.id,
      label: rawLabel.length > 0 ? rawLabel : null,
      token: randomBytes(24).toString("base64url")
    });
    res.json(key);
  };

  const deleteApiKeyHandler: RequestHandler<{ id: string }, StatusResponse | ErrorResponse> = async (req, res) => {
    await deleteApiKey(db, req.params.id, req.user.id);
    res.json({ status: "ok" });
  };

  app.get(`${API_BASE}/users/email-exists`, emailExistsHandler);
  app.get(`${API_BASE}/users/:id`, getUserHandler);
  app.get(`${API_BASE}/users/:id/memberships`, listUserMembershipsHandler);
  app.get(`${API_BASE}/users/:id/runs`, listUserRunsHandler);
  app.put(`${API_BASE}/users/:id/memberships/:organizationId`, redirectUserMembershipHandler);
  app.delete(`${API_BASE}/users/:id/memberships/:organizationId`, redirectUserMembershipHandler);
  app.patch(`${API_BASE}/users/me`, requireAuth(db), updateProfileHandler);
  app.get(`${API_BASE}/users/me/api-keys`, requireAuth(db), listApiKeysHandler);
  app.post(`${API_BASE}/users/me/api-keys`, requireAuth(db), createApiKeyHandler);
  app.delete(`${API_BASE}/users/me/api-keys/:id`, requireAuth(db), deleteApiKeyHandler);
}
