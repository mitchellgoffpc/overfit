import type { Organization, OrganizationMember, OrganizationRole, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

interface UserDetail extends User {
  organizations: (Organization & { role: OrganizationRole })[];
}

type UpsertUserPayload = Partial<Omit<User, "id" | "updatedAt">>;

export function registerUserRoutes(
  app: RouteApp,
  apiBase: string,
  users: EntityStore<User>,
  organizations: EntityStore<Organization>,
  organizationMembers: EntityStore<OrganizationMember>
): void {
  const listUsers: RequestHandler<Record<string, string>, User[]> = (_req, res) => {
    res.json(users.list());
  };

  const getUser: RequestHandler<RouteParams, UserDetail | ErrorResponse> = (req, res) => {
    const user = users.get(req.params.id);

    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      const memberships = organizationMembers.list().filter((member) => member.userId === user.id);
      const userOrganizations = memberships.flatMap((member) => {
        const organization = organizations.get(member.organizationId);
        return organization ? [{ ...organization, role: member.role }] : [];
      });

      res.json({ ...user, organizations: userOrganizations });
    }
  };

  const upsertUser: RequestHandler<RouteParams, User | ErrorResponse, UpsertUserPayload> = (req, res) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = users.get(id);

    const email = payload.email ?? existing?.email;
    const displayName = payload.displayName ?? existing?.displayName;
    const missingFields = Object.entries({ email, displayName }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `User fields are required: ${missingFields.join(", ")}` });
    } else {
      const user: User = {
        id,
        email,
        displayName,
        createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      users.upsert(user);
      res.json(user);
    }
  };

  app.get(`${apiBase}/users`, listUsers);
  app.get(`${apiBase}/users/:id`, getUser);
  app.put(`${apiBase}/users/:id`, upsertUser);
}
