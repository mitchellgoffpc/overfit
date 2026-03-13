import { randomBytes } from "crypto";

import { API_BASE, organizationRoles } from "@underfit/types";
import type { Organization, OrganizationMember, OrganizationRole, User } from "@underfit/types";
import { z } from "zod";

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
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const UpsertOrganizationPayloadSchema = z.object({
  name: z.string().optional()
});
const OrganizationMemberPayloadSchema = z.object({
  role: z.enum(organizationRoles).optional()
});

interface MemberRouteParams {
  handle: string;
  userHandle: string;
}

type OrganizationMembersResponse = (User & { role: OrganizationRole })[];
type UpsertOrganizationPayload = z.infer<typeof UpsertOrganizationPayloadSchema>;
type OrganizationMemberPayload = z.infer<typeof OrganizationMemberPayloadSchema>;

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
    const { success, error, data: { name } = {} } = UpsertOrganizationPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const handle = req.params.handle.trim().toLowerCase();
    const existing = await getOrganization(db, handle);
    const organization = await upsertOrganization(db, {
      id: existing?.id ?? randomBytes(16).toString("hex"),
      handle,
      name: name ?? existing?.name ?? handle,
      type: "ORGANIZATION"
    });
    res.json(organization);
  };

  const upsertOrganizationMemberHandler: RouteHandler<MemberRouteParams, OrganizationMember, OrganizationMemberPayload> = async (req, res) => {
    const { success, error, data: { role } = {} } = OrganizationMemberPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const handle = req.params.handle.trim().toLowerCase();
    const userHandle = req.params.userHandle.trim().toLowerCase();
    const organization = await getOrganization(db, handle);
    const user = await getUserByHandle(db, userHandle);

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      const membershipId = `${organization.id}:${user.id}`;
      const existing = await getOrganizationMember(db, membershipId);
      const member = await upsertOrganizationMember(db, {
        id: membershipId,
        organizationId: organization.id,
        userId: user.id,
        role: role ?? existing?.role ?? "MEMBER",
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
