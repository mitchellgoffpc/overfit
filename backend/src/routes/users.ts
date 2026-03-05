import type { Organization, OrganizationRole, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db/database";
import { listOrganizationMembersByUserId } from "db/repositories/organization-members";
import { getOrganization } from "db/repositories/organizations";
import { emailExists, getUser, upsertUser, usernameExists } from "db/repositories/users";
import { nowIso } from "routes/helpers";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

interface UserDetail extends User {
  organizations: (Organization & { role: OrganizationRole })[];
}

interface UpsertUserPayload {
  email?: string;
  username?: string;
  createdAt?: string;
}
interface EmailExistsQuery { email?: string }
interface UsernameExistsQuery { username?: string }
interface ExistsResponse { exists: boolean }

export function registerUserRoutes(app: RouteApp, apiBase: string, db: Database): void {
  const emailExistsHandler: RequestHandler<Record<string, string>, ExistsResponse | ErrorResponse, undefined, EmailExistsQuery> = async (req, res) => {
    const email = req.query.email?.trim() ?? "";
    if (!email) {
      res.status(400).json({ error: "Email is required" });
    } else {
      res.json({ exists: await emailExists(db, email) });
    }
  };

  const usernameExistsHandler: RequestHandler<Record<string, string>, ExistsResponse | ErrorResponse, undefined, UsernameExistsQuery> = async (req, res) => {
    const username = req.query.username?.trim() ?? "";
    if (!username) {
      res.status(400).json({ error: "Username is required" });
    } else {
      res.json({ exists: await usernameExists(db, username) });
    }
  };

  const getUserHandler: RequestHandler<RouteParams, UserDetail | ErrorResponse> = async (req, res) => {
    const user = await getUser(db, req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      const memberships = await listOrganizationMembersByUserId(db, user.id);
      const organizations = await Promise.all(memberships.map(async (member) => getOrganization(db, member.organizationId)));
      const userOrganizations = organizations.flatMap((organization, index) => (
        organization ? [{ ...organization, role: memberships[index].role }] : []
      ));

      res.json({ ...user, organizations: userOrganizations });
    }
  };

  const upsertUserHandler: RequestHandler<RouteParams, User | ErrorResponse, UpsertUserPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getUser(db, id);

    const email = req.body?.email ?? existing?.email;
    const username = req.body?.username ?? existing?.username;
    const missingFields = Object.entries({ email, username }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `User fields are required: ${missingFields.join(", ")}` });
    } else {
      const user: User = {
        id,
        email,
        username,
        createdAt: existing?.createdAt ?? req.body?.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      await upsertUser(db, user);
      res.json(user);
    }
  };

  app.get(`${apiBase}/users/email-exists`, emailExistsHandler);
  app.get(`${apiBase}/users/username-exists`, usernameExistsHandler);
  app.get(`${apiBase}/users/:id`, getUserHandler);
  app.put(`${apiBase}/users/:id`, upsertUserHandler);
}
