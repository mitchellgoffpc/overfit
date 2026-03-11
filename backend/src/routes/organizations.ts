import { randomBytes } from "crypto";

import { API_BASE, organizationRoles } from "@underfit/types";
import type { Organization, OrganizationMember, OrganizationRole, User } from "@underfit/types";

import type { Database } from "db";
import {
  deleteOrganizationMember,
  getOrganizationMember,
  hasOrganizationMember,
  listOrganizationUsersByOrganizationId,
  upsertOrganizationMember
} from "repositories/organization-members";
import { getOrganization, upsertOrganization } from "repositories/organizations";
import { getUserByHandle } from "repositories/users";
import type { RouteApp, RouteHandler } from "routes/helpers";

interface MemberRouteParams {
  handle: string;
  userHandle: string;
}

interface OrganizationMemberPayload {
  role?: OrganizationRole;
}

type OrganizationMembersResponse = (User & { role: OrganizationRole })[];

type UpsertOrganizationPayload = Partial<Omit<Organization, "id" | "createdAt" | "updatedAt">>;

export function registerOrganizationRoutes(app: RouteApp, db: Database): void {
  const listOrganizationMembersHandler: RouteHandler<{ handle: string }, OrganizationMembersResponse> = async (req, res) => {
    const organization = await getOrganization(db, req.params.handle.trim().toLowerCase());

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else {
      const members = await listOrganizationUsersByOrganizationId(db, organization.id);
      res.json(members);
    }
  };

  const upsertOrganizationHandler: RouteHandler<{ handle: string }, Organization, UpsertOrganizationPayload> = async (req, res) => {
    const handle = req.params.handle.trim().toLowerCase();
    const existing = await getOrganization(db, handle);
    const organization = await upsertOrganization(db, {
      id: existing?.id ?? randomBytes(16).toString("hex"),
      handle,
      displayName: req.body.displayName ?? existing?.displayName ?? handle,
      type: "ORGANIZATION"
    });
    res.json(organization);
  };

  const upsertOrganizationMemberHandler: RouteHandler<MemberRouteParams, OrganizationMember, OrganizationMemberPayload> = async (req, res) => {
    const organization = await getOrganization(db, req.params.handle.trim().toLowerCase());
    const user = await getUserByHandle(db, req.params.userHandle.trim().toLowerCase());
    const membershipId = `${organization?.id ?? ""}:${user?.id ?? ""}`;
    const existing = await getOrganizationMember(db, membershipId);
    const role = req.body.role ?? existing?.role ?? "MEMBER";

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else if (!organizationRoles.includes(role)) {
      res.status(400).json({ error: "Organization role is invalid" });
    } else {
      const member = await upsertOrganizationMember(db, {
        id: membershipId,
        organizationId: organization.id,
        userId: user.id,
        role
      });
      res.json(member);
    }
  };

  const deleteOrganizationMemberHandler: RouteHandler<MemberRouteParams, { ok: true }> = async (req, res) => {
    const organization = await getOrganization(db, req.params.handle.trim().toLowerCase());
    const user = await getUserByHandle(db, req.params.userHandle.trim().toLowerCase());
    const membershipId = `${organization?.id ?? ""}:${user?.id ?? ""}`;

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

  app.put(`${API_BASE}/organizations/:handle`, upsertOrganizationHandler);
  app.get(`${API_BASE}/organizations/:handle/members`, listOrganizationMembersHandler);
  app.put(`${API_BASE}/organizations/:handle/members/:userHandle`, upsertOrganizationMemberHandler);
  app.delete(`${API_BASE}/organizations/:handle/members/:userHandle`, deleteOrganizationMemberHandler);
}
