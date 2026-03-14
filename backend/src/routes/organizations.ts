import { API_BASE, organizationRoles } from "@underfit/types";
import type { Organization, OrganizationMember, OrganizationRole, User } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import {
  createOrganizationMember,
  deleteOrganizationMember,
  getOrganizationMember,
  listOrganizationUsersByOrganizationId
} from "repositories/organization-members";
import { createOrganization, getOrganization, updateOrganization } from "repositories/organizations";
import { getUserByHandle } from "repositories/users";
import { requireAuth } from "routes/auth";
import { formatZodError } from "routes/helpers";
import type { RouteApp, RouteHandler } from "routes/helpers";

const CreateOrganizationPayloadSchema = z.object({
  handle: z.string().trim().toLowerCase(),
  name: z.string()
});
const UpdateOrganizationPayloadSchema = z.object({
  name: z.string().optional()
});
const OrganizationMemberPayloadSchema = z.object({
  role: z.enum(organizationRoles).prefault("MEMBER")
});

interface MemberRouteParams {
  handle: string;
  userHandle: string;
}

type OrganizationMembersResponse = (User & { role: OrganizationRole })[];
type CreateOrganizationPayload = z.infer<typeof CreateOrganizationPayloadSchema>;
type UpdateOrganizationPayload = z.infer<typeof UpdateOrganizationPayloadSchema>;
type OrganizationMemberPayload = z.infer<typeof OrganizationMemberPayloadSchema>;

const isUniqueConstraintError = (error: unknown): boolean => {
  if (!(error instanceof Error)) { return false; }
  const { code } = error as Error & { code?: string };
  return code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT_PRIMARYKEY" || code === "23505" || error.message.includes("UNIQUE constraint failed");
};

export function registerOrganizationRoutes(app: RouteApp, db: Database): void {
  const createOrganizationHandler: RouteHandler<Record<string, never>, Organization, CreateOrganizationPayload> = async (req, res) => {
    const { success, error, data } = CreateOrganizationPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    try {
      const organization = await createOrganization(db, data);
      await createOrganizationMember(db, organization.id, req.user.id, "ADMIN");
      res.status(201).json(organization);
    } catch (caught) {
      if (isUniqueConstraintError(caught)) {
        res.status(409).json({ error: "Organization already exists" });
      } else {
        throw caught;
      }
    }
  };

  const updateOrganizationHandler: RouteHandler<{ handle: string }, Organization, UpdateOrganizationPayload> = async (req, res) => {
    const { success, error, data } = UpdateOrganizationPayloadSchema.safeParse(req.body);
    const handle = req.params.handle.trim().toLowerCase();
    const organization = await getOrganization(db, handle);
    const selfMember = organization ? await getOrganizationMember(db, organization.id, req.user.id) : undefined;

    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else if (selfMember?.role !== "ADMIN") {
      res.status(403).json({ error: "Forbidden" });
    } else {
      res.json(await updateOrganization(db, organization.id, { handle, name: data.name ?? organization.name }));
    }
  };

  const listOrganizationMembersHandler: RouteHandler<{ handle: string }, OrganizationMembersResponse> = async (req, res) => {
    const organization = await getOrganization(db, req.params.handle.trim().toLowerCase());
    if (!organization) {
      res.status(404).json({ error: "Organization not found" });
    } else {
      res.json(await listOrganizationUsersByOrganizationId(db, organization.id));
    }
  };

  const upsertOrganizationMemberHandler: RouteHandler<MemberRouteParams, OrganizationMember, OrganizationMemberPayload> = async (req, res) => {
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
    } else if (targetMember && !await deleteOrganizationMember(db, organization.id, user.id)) {
      res.status(400).json({ error: "Cannot remove the only admin" });
    } else {
      res.json(await createOrganizationMember(db, organization.id, user.id, data.role));
    }
  };

  const deleteOrganizationMemberHandler: RouteHandler<MemberRouteParams, { ok: true }> = async (req, res) => {
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

  app.post(`${API_BASE}/organizations`, requireAuth(db), createOrganizationHandler);
  app.patch(`${API_BASE}/organizations/:handle`, requireAuth(db), updateOrganizationHandler);
  app.get(`${API_BASE}/organizations/:handle/members`, listOrganizationMembersHandler);
  app.put(`${API_BASE}/organizations/:handle/members/:userHandle`, requireAuth(db), upsertOrganizationMemberHandler);
  app.delete(`${API_BASE}/organizations/:handle/members/:userHandle`, requireAuth(db), deleteOrganizationMemberHandler);
}
