import type { Organization, OrganizationMember, OrganizationRole, User } from "@overfit/types";

import type { ErrorResponse, RouteApp, RouteParams, RouteRequest, RouteResponse, UpsertOrganizationPayload } from "routes/helpers";
import { nowIso } from "routes/helpers";
import type { EntityStore } from "storage/types";

interface MemberRouteParams {
  id: string;
  userId: string;
}

interface OrganizationDetail extends Organization {
  users: (User & { role: OrganizationRole })[];
}

interface OrganizationMemberPayload {
  role?: OrganizationRole;
}

const organizationRoles: ReadonlySet<OrganizationRole> = new Set(["ADMIN", "MEMBER"]);

export function registerOrganizationRoutes(
  app: RouteApp,
  apiBase: string,
  organizations: EntityStore<Organization>,
  users: EntityStore<User>,
  organizationMembers: EntityStore<OrganizationMember>
): void {
  app.get(`${apiBase}/organizations`, (_req: RouteRequest, res: RouteResponse<Organization[]>) => {
    res.json(organizations.list());
  });

  app.get(`${apiBase}/organizations/:id`, (req: RouteRequest<RouteParams>, res: RouteResponse<OrganizationDetail | ErrorResponse>) => {
    const organization = organizations.get(req.params.id);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    const members = organizationMembers.list().filter((member) => member.organizationId === organization.id);
    const organizationUsers = members.flatMap((member) => {
      const user = users.get(member.userId);
      return user ? [{ ...user, role: member.role }] : [];
    });

    res.json({ ...organization, users: organizationUsers });
  });

  app.put(
    `${apiBase}/organizations/:id`,
    (req: RouteRequest<RouteParams, Organization | ErrorResponse, UpsertOrganizationPayload>, res: RouteResponse<Organization | ErrorResponse>) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = organizations.get(id);

    const name = payload.name ?? existing?.name;
    const slug = payload.slug ?? existing?.slug;

    for (const [label, value] of Object.entries({ name, slug })) {
      if (!value) {
        res.status(400).json({ error: `Organization ${label} is required` });
        return;
      }
    }

    const organization: Organization = {
      id,
      name,
      slug,
      createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
      updatedAt: nowIso()
    };

    organizations.upsert(organization);
    res.json(organization);
  });

  app.put(
    `${apiBase}/organizations/:id/members/:userId`,
    (req: RouteRequest<MemberRouteParams, OrganizationMember | ErrorResponse, OrganizationMemberPayload>, res: RouteResponse<OrganizationMember | ErrorResponse>) => {
      const organizationId = req.params.id;
      const userId = req.params.userId;
      const organization = organizations.get(organizationId);

      if (!organization) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const user = users.get(userId);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const membershipId = `${organizationId}:${userId}`;
      const existing = organizationMembers.get(membershipId);
      const role = req.body.role ?? existing?.role ?? "MEMBER";

      if (!organizationRoles.has(role)) {
        res.status(400).json({ error: "Organization role is invalid" });
        return;
      }

      const member: OrganizationMember = {
        id: membershipId,
        organizationId,
        userId,
        role,
        createdAt: existing?.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      organizationMembers.upsert(member);
      res.json(member);
    }
  );

  app.delete(
    `${apiBase}/organizations/:id/members/:userId`,
    (req: RouteRequest<MemberRouteParams, { ok: true } | ErrorResponse>, res: RouteResponse<{ ok: true } | ErrorResponse>) => {
      const organizationId = req.params.id;
      const userId = req.params.userId;
      const organization = organizations.get(organizationId);

      if (!organization) {
        res.status(404).json({ error: "Organization not found" });
        return;
      }

      const user = users.get(userId);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const membershipId = `${organizationId}:${userId}`;
      if (!organizationMembers.has(membershipId)) {
        res.status(404).json({ error: "Membership not found" });
        return;
      }

      organizationMembers.delete(membershipId);
      res.json({ ok: true });
    }
  );
}
