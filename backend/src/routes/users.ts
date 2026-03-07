import { API_BASE } from "@overfit/types";
import type { Organization, OrganizationRole, Run, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import { listOrganizationMembershipsByUserId } from "repositories/organization-members";
import { listRunsByUser } from "repositories/runs";
import { getUser, getUserByEmail } from "repositories/users";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

interface EmailExistsQuery { email?: string }
interface ExistsResponse { exists: boolean }
type UserMembershipsResponse = (Organization & { role: OrganizationRole })[];

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

  app.get(`${API_BASE}/users/email-exists`, emailExistsHandler);
  app.get(`${API_BASE}/users/:id`, getUserHandler);
  app.get(`${API_BASE}/users/:id/memberships`, listUserMembershipsHandler);
  app.get(`${API_BASE}/users/:id/runs`, listUserRunsHandler);
  app.put(`${API_BASE}/users/:id/memberships/:organizationId`, redirectUserMembershipHandler);
  app.delete(`${API_BASE}/users/:id/memberships/:organizationId`, redirectUserMembershipHandler);
}
