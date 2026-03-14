import { API_BASE } from "@underfit/types";
import type { Organization, OrganizationRole } from "@underfit/types";

import type { Database } from "db";
import { listOrganizationMembershipsByUserId } from "repositories/organization-members";
import { getUserByHandle } from "repositories/users";
import type { RouteApp, RouteHandler } from "routes/helpers";

type UserMembershipsResponse = (Organization & { role: OrganizationRole })[];

export function registerOrganizationMembershipRoutes(app: RouteApp, db: Database): void {
  const listUserMembershipsHandler: RouteHandler<{ handle: string }, UserMembershipsResponse> = async (req, res) => {
    const user = await getUserByHandle(db, req.params.handle.trim().toLowerCase());
    if (!user) {
      res.status(404).json({ error: "User not found" });
    } else {
      res.json(await listOrganizationMembershipsByUserId(db, user.id));
    }
  };

  const redirectUserMembershipHandler: RouteHandler<{ handle: string; organizationHandle: string }, unknown> = (req, res) => {
    res.redirect(307, `${API_BASE}/organizations/${req.params.organizationHandle}/members/${req.params.handle}`);
  };

  app.get(`${API_BASE}/users/:handle/memberships`, listUserMembershipsHandler);
  app.put(`${API_BASE}/users/:handle/memberships/:organizationHandle`, redirectUserMembershipHandler);
  app.delete(`${API_BASE}/users/:handle/memberships/:organizationHandle`, redirectUserMembershipHandler);
}
