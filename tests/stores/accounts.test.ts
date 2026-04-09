import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteAvatar, fetchAccount, getMe, searchUsers, updateMe, updateAvatar, useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";
import { API_BASE } from "types";
import type { Organization, User } from "types";

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

const user: User = {
  id: "user-1",
  handle: "ada",
  name: "Ada Lovelace",
  type: "USER",
  email: "ada@underfit.local",
  bio: "",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

const organization: Organization = {
  id: "org-1",
  handle: "acme",
  type: "ORGANIZATION",
  name: "Acme AI",
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

describe("accounts store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useAuthStore.setState({ status: "idle", currentHandle: null });
    useAccountsStore.setState({ accounts: {} });
    vi.restoreAllMocks();
  });

  it("stores and retrieves accounts by handle", () => {
    useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [user.handle]: user } }));
    useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [organization.handle]: organization } }));

    expect(useAccountsStore.getState().accounts["ada"]).toEqual(user);
    expect(useAccountsStore.getState().accounts["acme"]).toEqual(organization);
    expect(useAccountsStore.getState().accounts["missing"]).toBeUndefined();
  });

  it("updates the user", async () => {
    const updated = { ...user, name: "Ada", bio: "Math pioneer" };
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [user.handle]: user } }));
    fetchMock.mockResolvedValueOnce(createResponse(updated));

    const result = await updateMe("Ada", "Math pioneer");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/me`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada", bio: "Math pioneer" })
    });
    expect(useAccountsStore.getState().accounts[user.handle]).toEqual(updated);
  });

  it("loads a user account by handle", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(user));

    const result = await fetchAccount(user.handle);

    expect(result).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/accounts/${user.handle}`, { credentials: "include" });
    expect(useAccountsStore.getState().accounts[user.handle]).toEqual(user);
  });

  it("loads an organization account by handle", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(organization));

    const result = await fetchAccount(organization.handle);

    expect(result).toEqual(organization);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/accounts/${organization.handle}`, { credentials: "include" });
    expect(useAccountsStore.getState().accounts[organization.handle]).toEqual(organization);
  });

  it("returns null when loading an account by handle fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Account not found" }, { ok: false, status: 404 }));

    const result = await fetchAccount("missing");

    expect(result).toBeNull();
    expect(useAccountsStore.getState().accounts["missing"]).toBeUndefined();
  });

  it("returns an error when updating the user fails", async () => {
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [user.handle]: user } }));
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Invalid profile" }, { ok: false, status: 400 }));

    const result = await updateMe("", "Math pioneer");

    expect(result).toEqual({ ok: false, error: "Invalid profile" });
    expect(useAccountsStore.getState().accounts[user.handle]).toEqual(user);
  });

  it("returns the current user through me()", () => {
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [user.handle]: user } }));

    expect(getMe(useAccountsStore.getState())).toEqual(user);
  });

  it("uploads the current account avatar", async () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));

    const result = await updateAvatar(file);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/me/avatar`, {
      credentials: "include",
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: expect.any(ArrayBuffer) as unknown
    });
  });

  it("deletes the current account avatar", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));

    const result = await deleteAvatar();

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/me/avatar`, { credentials: "include", method: "DELETE" });
  });

  it("searches users by query", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([user]));

    const result = await searchUsers("ada");

    expect(result).toEqual({ ok: true, body: [user] });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/users/search?query=ada`, { credentials: "include" });
  });

  it("returns an empty list when user search query is blank", async () => {
    const result = await searchUsers("   ");

    expect(result).toEqual({ ok: true, body: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
