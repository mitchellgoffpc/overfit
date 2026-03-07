import type { Organization, OrganizationRole, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { listOrganizationMembershipsByUserId } from "repositories/organization-members";
import { getUser, getUserByEmail, upsertUser } from "repositories/users";
import { nowIso } from "routes/helpers";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

interface UpsertUserPayload {
  email?: string;
  handle?: string;
  displayName?: string;
  createdAt?: string;
}
interface EmailExistsQuery { email?: string }
interface ExistsResponse { exists: boolean }
type UserMembershipsResponse = (Organization & { role: OrganizationRole })[];

export function registerUserRoutes(app: RouteApp, apiBase: string, db: Database): void {
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

  const upsertUserHandler: RequestHandler<RouteParams, User | ErrorResponse, UpsertUserPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getUser(db, id);

    const email = req.body?.email ?? existing?.email;
    const handle = req.body?.handle ?? existing?.handle;
    const displayName = req.body?.displayName ?? existing?.displayName ?? handle;
    const missingFields = Object.entries({ email, handle }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `User fields are required: ${missingFields.join(", ")}` });
    } else {
      const user: User = {
        id,
        email,
        handle,
        displayName,
        createdAt: existing?.createdAt ?? req.body?.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      await upsertUser(db, user);
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

  const redirectUserMembershipHandler: RequestHandler<{ id: string; organizationId: string }> = (req, res) => {
    res.redirect(307, `${apiBase}/organizations/${req.params.organizationId}/members/${req.params.id}`);
  };

  app.get(`${apiBase}/users/email-exists`, emailExistsHandler);
  app.get(`${apiBase}/users/:id`, getUserHandler);
  app.put(`${apiBase}/users/:id`, upsertUserHandler);
  app.get(`${apiBase}/users/:id/memberships`, listUserMembershipsHandler);
  app.put(`${apiBase}/users/:id/memberships/:organizationId`, redirectUserMembershipHandler);
  app.delete(`${apiBase}/users/:id/memberships/:organizationId`, redirectUserMembershipHandler);
}
