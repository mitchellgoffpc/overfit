import { organizationRoles } from "@overfit/types";
import type { Organization, OrganizationMember, OrganizationRole, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import {
  deleteOrganizationMember,
  getOrganizationMember,
  hasOrganizationMember,
  listOrganizationMembersByOrganizationId,
  upsertOrganizationMember
} from "db/repositories/organization-members";
import { getOrganization, listOrganizations, upsertOrganization } from "db/repositories/organizations";
import { getUser } from "db/repositories/users";
import { nowIso } from "routes/helpers";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

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

export function registerOrganizationRoutes(app: RouteApp, apiBase: string, db: Database): void {
  const listOrganizationsHandler: RequestHandler<Record<string, string>, Organization[]> = async (_req, res) => {
    res.json(await listOrganizations(db));
  };

  const getOrganizationHandler: RequestHandler<RouteParams, OrganizationDetail | ErrorResponse> = async (req, res) => {
    const organization = await getOrganization(db, req.params.id);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else {
      const members = await listOrganizationMembersByOrganizationId(db, organization.id);
      const users = await Promise.all(members.map(async (member) => getUser(db, member.userId)));
      const organizationUsers = users.flatMap((user, index) => user ? [{ ...user, role: members[index].role }] : []);

      res.json({ ...organization, users: organizationUsers });
    }
  };

  const upsertOrganizationHandler: RequestHandler<RouteParams, Organization | ErrorResponse, UpsertOrganizationPayload | undefined> = async (req, res) => {
    const id = req.params.id;
    const existing = await getOrganization(db, id);

    const handle = req.body?.handle ?? existing?.handle;
    const displayName = req.body?.displayName ?? existing?.displayName ?? handle;
    const missingFields = Object.entries({ handle }).filter(([, value]) => !value).map(([label]) => label);

    if (missingFields.length > 0) {
      res.status(400).json({ error: `Organization fields are required: ${missingFields.join(", ")}` });
    } else {
      const organization: Organization = {
        id,
        handle,
        displayName,
        type: "ORGANIZATION",
        createdAt: existing?.createdAt ?? req.body?.createdAt ?? nowIso(),
        updatedAt: nowIso()
      };

      await upsertOrganization(db, organization);
      res.json(organization);
    }
  };

  const upsertOrganizationMemberHandler: RequestHandler<MemberRouteParams, OrganizationMember | ErrorResponse, OrganizationMemberPayload | undefined> = async (req, res) => {
    const organizationId = req.params.id;
    const userId = req.params.userId;
    const membershipId = `${organizationId}:${userId}`;
    const organization = await getOrganization(db, organizationId);
    const user = await getUser(db, userId);
    const existing = await getOrganizationMember(db, membershipId);
    const role = req.body?.role ?? existing?.role ?? "MEMBER";

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else if (!organizationRoles.includes(role)) {
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

      await upsertOrganizationMember(db, member);
      res.json(member);
    }
  };

  const deleteOrganizationMemberHandler: RequestHandler<MemberRouteParams, { ok: true } | ErrorResponse> = async (req, res) => {
    const organizationId = req.params.id;
    const userId = req.params.userId;
    const membershipId = `${organizationId}:${userId}`;
    const organization = await getOrganization(db, organizationId);
    const user = await getUser(db, userId);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else if (!await hasOrganizationMember(db, membershipId)) {
      res.status(404).json({ error: "Membership not found" });
    } else {
      await deleteOrganizationMember(db, membershipId);
      res.json({ ok: true });
    }
  };

  app.get(`${apiBase}/organizations`, listOrganizationsHandler);
  app.get(`${apiBase}/organizations/:id`, getOrganizationHandler);
  app.put(`${apiBase}/organizations/:id`, upsertOrganizationHandler);
  app.put(`${apiBase}/organizations/:id/members/:userId`, upsertOrganizationMemberHandler);
  app.delete(`${apiBase}/organizations/:id/members/:userId`, deleteOrganizationMemberHandler);
}
