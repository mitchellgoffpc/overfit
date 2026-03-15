import { API_BASE, organizationRoles } from "@underfit/types";
import type { Organization, OrganizationMember, OrganizationRole, User } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError } from "helpers";
import type { RouteApp, RouteHandler } from "helpers";
import {
  createOrganizationMember,
  deleteOrganizationMember,
  getOrganizationMember,
  listOrganizationMembers,
  listUserMemberships
} from "repositories/organization-members";
import { getOrganization } from "repositories/organizations";
import { getUserByHandle } from "repositories/users";
import { requireAuth } from "routes/auth";

const OrganizationMemberPayloadSchema = z.object({
  role: z.enum(organizationRoles).prefault("MEMBER")
});

type OrganizationMembersResponse = (User & { role: OrganizationRole })[];
type UserMembershipsResponse = (Organization & { role: OrganizationRole })[];
type OrganizationMemberPayload = z.infer<typeof OrganizationMemberPayloadSchema>;

export function registerOrganizationMembershipRoutes(app: RouteApp, db: Database): void {
  const listOrganizationMembersHandler: RouteHandler<{ handle: string }, OrganizationMembersResponse> = async (req, res) => {
    const organization = await getOrganization(db, req.params.handle.trim().toLowerCase());
    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else {
      res.json(await listOrganizationMembers(db, organization.id));
    }
  };

  const upsertOrganizationMemberHandler: RouteHandler<
    { handle: string; userHandle: string }, OrganizationMember, OrganizationMemberPayload
  > = async (req, res) => {
    const { success, error, data } = OrganizationMemberPayloadSchema.safeParse(req.body);
    const handle = req.params.handle.trim().toLowerCase();
    const userHandle = req.params.userHandle.trim().toLowerCase();
    const organization = await getOrganization(db, handle);
    const user = await getUserByHandle(db, userHandle);
    const selfMember = organization ? await getOrganizationMember(db, organization.id, req.user.id) : undefined;
    const targetMember = organization && user ? await getOrganizationMember(db, organization.id, user.id) : undefined;

    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else if (selfMember?.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
    } else if (targetMember?.role === data.role) {
      res.json(targetMember);
    } else if (targetMember && !await deleteOrganizationMember(db, organization.id, user.id)) {
      res.status(400).json({ error: "Cannot remove the only admin" });
    } else {
      res.json(await createOrganizationMember(db, organization.id, user.id, data.role));
    }
  };

  const deleteOrganizationMemberHandler: RouteHandler<{ handle: string; userHandle: string }, { ok: true }> = async (req, res) => {
    const organization = await getOrganization(db, req.params.handle.trim().toLowerCase());
    const user = await getUserByHandle(db, req.params.userHandle.trim().toLowerCase());
    const selfMember = organization ? await getOrganizationMember(db, organization.id, req.user.id) : undefined;
    const targetMember = organization && user ? await getOrganizationMember(db, organization.id, user.id) : undefined;

    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (!user) {
      res.status(404).json({ error: "User not found" });
    } else if (req.user.id !== user.id && selfMember?.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
    } else if (!targetMember) {
      res.status(404).json({ error: "Membership not found" });
    } else if (!await deleteOrganizationMember(db, organization.id, user.id)) {
      res.status(400).json({ error: "Cannot remove the only admin" });
    } else {
      res.json({ ok: true });
    }
  };

  const listUserMembershipsHandler: RouteHandler<{ handle: string }, UserMembershipsResponse> = async (req, res) => {
    const user = await getUserByHandle(db, req.params.handle.trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(await listUserMemberships(db, user.id));
    }
  };

  const redirectUserMembershipHandler: RouteHandler<{ handle: string; organizationHandle: string }, unknown> = (req, res) => {
    res.redirect(307, `${API_BASE}/organizations/${req.params.organizationHandle}/members/${req.params.handle}`);
  };

  app.get(`${API_BASE}/organizations/:handle/members`, listOrganizationMembersHandler);
  app.put(`${API_BASE}/organizations/:handle/members/:userHandle`, requireAuth(db), upsertOrganizationMemberHandler);
  app.delete(`${API_BASE}/organizations/:handle/members/:userHandle`, requireAuth(db), deleteOrganizationMemberHandler);
  app.get(`${API_BASE}/users/:handle/memberships`, listUserMembershipsHandler);
  app.put(`${API_BASE}/users/:handle/memberships/:organizationHandle`, redirectUserMembershipHandler);
  app.delete(`${API_BASE}/users/:handle/memberships/:organizationHandle`, redirectUserMembershipHandler);
}
