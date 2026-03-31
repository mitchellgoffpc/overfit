
import type { ActionResult } from "helpers";
import { request, send } from "helpers";
import { useAuthStore } from "stores/auth";
import type { Organization, OrganizationRole, User } from "types";

export type OrganizationMemberWithRole = User & { role: OrganizationRole };
type Membership = Organization & { role: OrganizationRole };

export const fetchMyMemberships = async (): Promise<ActionResult<Membership[]>> => {
  const handle = useAuthStore.getState().currentHandle;
  if (!handle) { return { ok: false, error: "Not authenticated" }; }
  const result = await request<Membership[]>(`users/${handle}/memberships`);
  return result.ok ? { ok: true, body: result.body } : { ok: false, error: result.error };
};

export const createOrganization = async (handle: string, name: string): Promise<ActionResult<Organization>> => {
  const result = await send<Organization>("organizations", "POST", { handle, name });
  return result.ok ? { ok: true, body: result.body } : { ok: false, error: result.error };
};

export const fetchOrganizationMembers = async (orgHandle: string): Promise<ActionResult<OrganizationMemberWithRole[]>> => {
  const result = await request<OrganizationMemberWithRole[]>(`organizations/${orgHandle}/members`);
  return result.ok ? { ok: true, body: result.body } : { ok: false, error: result.error };
};

export const leaveOrganization = async (orgHandle: string): Promise<ActionResult> => {
  const userHandle = useAuthStore.getState().currentHandle;
  if (!userHandle) { return { ok: false, error: "Not authenticated" }; }
  const result = await request<{ ok: true }>(`organizations/${orgHandle}/members/${userHandle}`, { method: "DELETE" });
  return result.ok ? { ok: true } : { ok: false, error: result.error };
};
