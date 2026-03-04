import { organizationRoles } from "@overfit/types";
import type { Organization, OrganizationMember, OrganizationRole, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";
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

type UpsertOrganizationPayload = Partial<Omit<Organization, "id" | "updatedAt">>;

export function registerOrganizationRoutes(
  app: RouteApp,
  apiBase: string,
  organizations: EntityStore<Organization>,
  users: EntityStore<User>,
  organizationMembers: EntityStore<OrganizationMember>
): void {
  const listOrganizations: RequestHandler<Record<string, string>, Organization[]> = (_req, res) => {
    res.json(organizations.list());
  };

  const getOrganization: RequestHandler<RouteParams, OrganizationDetail | ErrorResponse> = (req, res) => {
    const organization = organizations.get(req.params.id);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else {
      const members = organizationMembers.list().filter((member) => member.organizationId === organization.id);
      const organizationUsers = members.flatMap((member) => {
        const user = users.get(member.userId);
        return user ? [{ ...user, role: member.role }] : [];
      });

      res.json({ ...organization, users: organizationUsers });
    }
  };

  const upsertOrganization: RequestHandler<RouteParams, Organization | ErrorResponse, UpsertOrganizationPayload> = (req, res) => {
    const id = req.params.id;
    const payload = req.body;
    const existing = organizations.get(id);

    const name = payload.name ?? existing?.name;
    const slug = payload.slug ?? existing?.slug;
    const missingFields = Object.entries({ name, slug }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Organization fields are required: ${missingFields.join(", ")}` });
    } else {
      const organization: Organization = {
        id,
        name,
        slug,
        createdAt: existing?.createdAt ?? payload.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      organizations.upsert(organization);
      res.json(organization);
    }
  };

  const upsertOrganizationMember: RequestHandler<MemberRouteParams, OrganizationMember | ErrorResponse, OrganizationMemberPayload> = (req, res) => {
    const organizationId = req.params.id;
    const userId = req.params.userId;
    const membershipId = `${organizationId}:${userId}`;
    const organization = organizations.get(organizationId);
    const user = users.get(userId);
    const existing = organizationMembers.get(membershipId);
    const role = req.body.role ?? existing?.role ?? "MEMBER";

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else if (!organizationRoles.has(role)) {
      res.status(400).json({ error: "Organization role is invalid" });
    } else {
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
  };

  const deleteOrganizationMember: RequestHandler<MemberRouteParams, { ok: true } | ErrorResponse> = (req, res) => {
    const organizationId = req.params.id;
    const userId = req.params.userId;
    const membershipId = `${organizationId}:${userId}`;
    const organization = organizations.get(organizationId);
    const user = users.get(userId);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else if (!organizationMembers.has(membershipId)) {
      res.status(404).json({ error: "Membership not found" });
    } else {
      organizationMembers.delete(membershipId);
      res.json({ ok: true });
    }
  };

  app.get(`${apiBase}/organizations`, listOrganizations);
  app.get(`${apiBase}/organizations/:id`, getOrganization);
  app.put(`${apiBase}/organizations/:id`, upsertOrganization);
  app.put(`${apiBase}/organizations/:id/members/:userId`, upsertOrganizationMember);
  app.delete(`${apiBase}/organizations/:id/members/:userId`, deleteOrganizationMember);
}
