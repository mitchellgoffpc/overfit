import { API_BASE } from "@underfit/types";
import type { Organization } from "@underfit/types";
import { z } from "zod";

import type { Database } from "db";
import { formatZodError } from "helpers";
import type { Empty, RouteApp, RouteHandler } from "helpers";
import { createOrganizationMember, getOrganizationMember } from "repositories/organization-members";
import { createOrganization, getOrganization, updateOrganization } from "repositories/organizations";
import { requireAuth } from "routes/auth";

const CreateOrganizationPayloadSchema = z.strictObject({
  handle: z.string().trim().toLowerCase().min(1),
  name: z.string().trim().min(1)
});
const UpdateOrganizationPayloadSchema = z.strictObject({
  name: z.string().trim().min(1).exactOptional()
});

type CreateOrganizationPayload = z.infer<typeof CreateOrganizationPayloadSchema>;
type UpdateOrganizationPayload = z.infer<typeof UpdateOrganizationPayloadSchema>;

export function registerOrganizationRoutes(app: RouteApp, db: Database): void {
  const createOrganizationHandler: RouteHandler<Empty, Organization, CreateOrganizationPayload> = async (req, res) => {
    const { success, error, data } = CreateOrganizationPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
      return;
    }

    const organization = await createOrganization(db, data);
    if (!organization) {
      res.status(409).json({ error: "Organization already exists" });
    } else {
      await createOrganizationMember(db, organization.id, req.user.id, "ADMIN");
      res.status(201).json(organization);
    }
  };

  const updateOrganizationHandler: RouteHandler<{ handle: string }, Organization, UpdateOrganizationPayload> = async (req, res) => {
    const { success, error, data } = UpdateOrganizationPayloadSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({ error: formatZodError(error) });
    } else {
      const handle = req.params.handle.trim().toLowerCase();
      const organization = await getOrganization(db, handle);
      const selfMember = organization ? await getOrganizationMember(db, organization.id, req.user.id) : undefined;
      if (!organization) {
        res.status(404).json({ error: "Organization not found" });
      } else if (selfMember?.role !== "ADMIN") {
        res.status(403).json({ error: "Forbidden" });
      } else {
        const updated = await updateOrganization(db, organization.id, data);
        if (!updated) {
          res.status(404).json({ error: "Organization not found" });
        } else {
          res.json(updated);
        }
      }
    }
  };

  app.post(`${API_BASE}/organizations`, requireAuth(db), createOrganizationHandler);
  app.patch(`${API_BASE}/organizations/:handle`, requireAuth(db), updateOrganizationHandler);
}
