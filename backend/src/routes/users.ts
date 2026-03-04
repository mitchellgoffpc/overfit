import type { Organization, OrganizationMember, OrganizationRole, User } from "@overfit/types";

import type { ErrorResponse, RouteApp, RouteParams, RouteRequest, RouteResponse, UpsertUserPayload } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

export function registerUserRoutes(
  app: RouteApp,
  apiBase: string,
  users: EntityStore<User>,
  organizations: EntityStore<Organization>,
  organizationMembers: EntityStore<OrganizationMember>
): void {
  interface UserDetail extends User {
    organizations: (Organization & { role: OrganizationRole })[];
  }

  app.get(`${apiBase}/users`, (_req: RouteRequest, res: RouteResponse<User[]>) => {
    res.json(users.list());
  });

  app.get(`${apiBase}/users/:id`, (req: RouteRequest<RouteParams>, res: RouteResponse<UserDetail | ErrorResponse>) => {
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
  });

  app.put(
    `${apiBase}/users/:id`,
    (req: RouteRequest<RouteParams, User | ErrorResponse, UpsertUserPayload>, res: RouteResponse<User | ErrorResponse>) => {
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
  });
}
