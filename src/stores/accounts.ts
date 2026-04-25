import { create } from "zustand";

import type { ActionResult } from "helpers";
import { cachedMerge, request, send } from "helpers";
import { useAuthStore } from "stores/auth";
import type { Organization, OrganizationRole, Timestamp, User } from "types";

export interface MembershipDetails {
  handle: string;
  role: OrganizationRole;
}

export interface OrganizationMemberDetails extends MembershipDetails {
  membershipCreatedAt: Timestamp;
  membershipUpdatedAt: Timestamp;
};

export type OrganizationMember = User & OrganizationMemberDetails;
export type OrganizationMembership = Organization & MembershipDetails;

interface AccountsState {
  accounts: Record<string, User | Organization>;
  notFoundHandles: Set<string>;
  avatarVersion: number;
  membershipsByUser: Record<string, Record<string, MembershipDetails>>;
  membersByOrganization: Record<string, Record<string, OrganizationMemberDetails>>;
}

export const useAccountsStore = create<AccountsState>(() => ({
  accounts: {},
  notFoundHandles: new Set(),
  avatarVersion: Date.now(),
  membershipsByUser: {},
  membersByOrganization: {},
}));

const indexByHandle = <T extends { handle: string }>(items: T[]): Record<string, T> => Object.fromEntries(items.map((item) => [item.handle, item]));

const pickMembershipFields = (m: MembershipDetails): MembershipDetails => ({ handle: m.handle, role: m.role });

const pickOrganizationMemberFields = (m: OrganizationMemberDetails): OrganizationMemberDetails => (
  { handle: m.handle, role: m.role, membershipCreatedAt: m.membershipCreatedAt, membershipUpdatedAt: m.membershipUpdatedAt }
);

const omitMembershipFields = <T extends MembershipDetails>(m: T): Omit<T, "role"> => {
  const { role: _r, ...rest } = m;
  return rest;
};

const omitOrganizationMemberFields = <T extends OrganizationMemberDetails>(m: T): Omit<T, "role" | "membershipCreatedAt" | "membershipUpdatedAt"> => {
  const { role: _r, membershipCreatedAt: _c, membershipUpdatedAt: _u, ...rest } = m;
  return rest;
};

// Accounts

export const fetchAccount = async (handle: string): Promise<User | Organization | null> => {
  const { ok, body } = await request<User | Organization>(`accounts/${handle}`);
  if (!ok) {
    useAccountsStore.setState((state) => ({ notFoundHandles: new Set(state.notFoundHandles).add(handle) }));
    return null;
  }
  useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [body.handle]: body } }));
  return body;
};

// Users

export const searchUsers = async (query: string): Promise<ActionResult<User[]>> => {
  const normalized = query.trim();
  if (!normalized) { return { ok: true, body: [] }; }
  const { ok, body, error } = await request<User[]>(`users/search?query=${encodeURIComponent(normalized)}`);
  return ok ? { ok: true, body } : { ok: false, error };
};

export const getMe = (state: AccountsState): User | null => {
  const currentHandle = useAuthStore.getState().currentHandle;
  const account = currentHandle ? state.accounts[currentHandle] ?? null : null;
  return account?.type === "USER" ? account : null;
};

export const updateMe = async (name: string, bio: string): Promise<ActionResult> => {
  const { ok, error, body } = await send<User>("me", "PATCH", { name, bio });
  if (!ok) { return { ok: false, error }; }
  useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [body.handle]: body } }));
  return { ok: true };
};

// Avatars

export const updateAvatar = async (file: File): Promise<ActionResult> => {
  const body = await file.arrayBuffer();
  const { ok, error } = await request<{ status: "ok" }>("me/avatar", {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body
  });
  if (ok) { useAccountsStore.setState({ avatarVersion: Date.now() }); }
  return ok ? { ok: true } : { ok: false, error };
};

export const deleteAvatar = async (): Promise<ActionResult> => {
  const { ok, error } = await request<{ status: "ok" }>("me/avatar", { method: "DELETE" });
  if (ok) { useAccountsStore.setState({ avatarVersion: Date.now() }); }
  return ok ? { ok: true } : { ok: false, error };
};

// Memberships

export const getUserMemberships = (userHandle: string) => (state: AccountsState): OrganizationMembership[] => (
  Object.values(userHandle ? state.membershipsByUser[userHandle] ?? {} : {})
    .map((m) => { const a = state.accounts[m.handle]; return a?.type === "ORGANIZATION" ? cachedMerge(a, m) : null; })
    .filter((m): m is OrganizationMembership => m !== null)
    .sort((a, b) => a.handle.localeCompare(b.handle))
);

export const getOrganizationMembers = (orgHandle: string) => (state: AccountsState): OrganizationMember[] => (
  Object.values(state.membersByOrganization[orgHandle] ?? {})
    .map((m) => { const a = state.accounts[m.handle]; return a?.type === "USER" ? cachedMerge(a, m) : null; })
    .filter((m): m is OrganizationMember => m !== null)
    .sort((a, b) => a.handle.localeCompare(b.handle))
);

export const fetchUserMemberships = async (userHandle: string | null = useAuthStore.getState().currentHandle): Promise<ActionResult> => {
  if (!userHandle) { return { ok: false, error: "Not authenticated" }; }
  const { ok, body, error } = await request<OrganizationMembership[]>(`users/${userHandle}/memberships`);
  if (!ok) { return { ok: false, error }; }
  useAccountsStore.setState((state) => ({
    accounts: { ...state.accounts, ...indexByHandle(body.map(omitMembershipFields)) },
    membershipsByUser: { ...state.membershipsByUser, [userHandle]: indexByHandle(body.map(pickMembershipFields)) }
  }));
  return { ok: true };
};

export const fetchOrganizationMembers = async (orgHandle: string): Promise<ActionResult> => {
  const { ok, body, error } = await request<OrganizationMember[]>(`organizations/${orgHandle}/members`);
  if (!ok) { return { ok: false, error }; }
  useAccountsStore.setState((state) => ({
    accounts: { ...state.accounts, ...indexByHandle(body.map(omitOrganizationMemberFields)) },
    membersByOrganization: { ...state.membersByOrganization, [orgHandle]: indexByHandle(body.map(pickOrganizationMemberFields)) }
  }));
  return { ok: true };
};

export const addMembership = (org: Organization, role: OrganizationRole): void => {
  const me = getMe(useAccountsStore.getState());
  if (!me) { return; }
  const now = new Date().toISOString();
  const membership: MembershipDetails = { handle: org.handle, role };
  const memberEntry: OrganizationMemberDetails = { handle: me.handle, role, membershipCreatedAt: now, membershipUpdatedAt: now };
  useAccountsStore.setState((state) => {
    const userMemberships = state.membershipsByUser[me.handle];
    const orgMembers = state.membersByOrganization[org.handle];
    return {
      accounts: { ...state.accounts, [org.handle]: org },
      membershipsByUser: userMemberships
        ? { ...state.membershipsByUser, [me.handle]: { ...userMemberships, [org.handle]: membership } }
        : state.membershipsByUser,
      membersByOrganization: orgMembers
        ? { ...state.membersByOrganization, [org.handle]: { ...orgMembers, [me.handle]: memberEntry } }
        : state.membersByOrganization,
    };
  });
};

export const leaveOrganization = async (orgHandle: string): Promise<ActionResult> => {
  const userHandle = useAuthStore.getState().currentHandle;
  if (!userHandle) { return { ok: false, error: "Not authenticated" }; }
  const { ok, error } = await request<{ ok: true }>(`organizations/${orgHandle}/members/${userHandle}`, { method: "DELETE" });
  if (!ok) { return { ok: false, error }; }
  useAccountsStore.setState((state) => {
    const userMemberships = state.membershipsByUser[userHandle];
    const orgMembers = state.membersByOrganization[orgHandle];
    const { [orgHandle]: _, ...nextUserMemberships } = userMemberships ?? {};
    const { [userHandle]: __, ...nextOrgMembers } = orgMembers ?? {};
    return {
      membershipsByUser: userMemberships ? { ...state.membershipsByUser, [userHandle]: nextUserMemberships } : state.membershipsByUser,
      membersByOrganization: orgMembers ? { ...state.membersByOrganization, [orgHandle]: nextOrgMembers } : state.membersByOrganization
    };
  });
  return { ok: true };
};

// Organizations

export const createOrganization = async (handle: string, name: string): Promise<ActionResult<Organization>> => {
  const { ok, body, error } = await send<Organization>("organizations", "POST", { handle, name });
  if (!ok) { return { ok: false, error }; }
  addMembership(body, "ADMIN");
  return { ok: true, body };
};
