import { API_BASE, organizationRoles } from "@overfit/types";
import type { Organization, OrganizationMember, OrganizationRole, User } from "@overfit/types";
import type { RequestHandler } from "express";

import type { Database } from "db";
import {
  deleteOrganizationMember,
  getOrganizationMember,
  hasOrganizationMember,
  listOrganizationUsersByOrganizationId,
  upsertOrganizationMember
} from "repositories/organization-members";
import { getOrganization, listOrganizations, upsertOrganization } from "repositories/organizations";
import { getUser } from "repositories/users";
import type { ErrorResponse, RouteApp, RouteParams } from "routes/helpers";

interface MemberRouteParams {
  id: string;
  userId: string;
}

interface OrganizationMemberPayload {
  role?: OrganizationRole;
}

type OrganizationMembersResponse = (User & { role: OrganizationRole })[];

type UpsertOrganizationPayload = Partial<Omit<Organization, "id" | "createdAt" | "updatedAt">>;

export function registerOrganizationRoutes(app: RouteApp, db: Database): void {
  const listOrganizationsHandler: RequestHandler<Record<string, string>, Organization[]> = async (_req, res) => {
    res.json(await listOrganizations(db));
  };

  const getOrganizationHandler: RequestHandler<RouteParams, Organization | ErrorResponse> = async (req, res) => {
    const organization = await getOrganization(db, req.params.id);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else {
      res.json(organization);
    }
  };

  const listOrganizationMembersHandler: RequestHandler<RouteParams, OrganizationMembersResponse | ErrorResponse> = async (req, res) => {
    const organization = await getOrganization(db, req.params.id);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else {
      const members = await listOrganizationUsersByOrganizationId(db, organization.id);
      res.json(members);
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
      const organization = await upsertOrganization(db, {
        id,
        handle,
        displayName,
        type: "ORGANIZATION"
      });
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
      const member = await upsertOrganizationMember(db, {
        id: membershipId,
        organizationId,
        userId,
        role
      });
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

  app.get(`${API_BASE}/organizations`, listOrganizationsHandler);
  app.get(`${API_BASE}/organizations/:id`, getOrganizationHandler);
  app.get(`${API_BASE}/organizations/:id/members`, listOrganizationMembersHandler);
  app.put(`${API_BASE}/organizations/:id`, upsertOrganizationHandler);
  app.put(`${API_BASE}/organizations/:id/members/:userId`, upsertOrganizationMemberHandler);
  app.delete(`${API_BASE}/organizations/:id/members/:userId`, deleteOrganizationMemberHandler);
}
