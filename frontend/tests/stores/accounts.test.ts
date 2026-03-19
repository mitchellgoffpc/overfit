import { API_VERSION } from "@underfit/types";
import type { Organization, User } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteCurrentAccountAvatar, uploadCurrentAccountAvatar, useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

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
  bio: null,
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
    useAccountsStore.getState().setAccount(user);
    useAccountsStore.getState().setAccount(organization);

    expect(useAccountsStore.getState().accounts["ada"]).toEqual(user);
    expect(useAccountsStore.getState().accounts["acme"]).toEqual(organization);
    expect(useAccountsStore.getState().accounts["missing"]).toBeUndefined();
  });

  it("updates the user", async () => {
    const updated = { ...user, name: "Ada", bio: "Math pioneer" };
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.getState().setAccount(user);
    fetchMock.mockResolvedValueOnce(createResponse(updated));

    const result = await useAccountsStore.getState().updateProfile("Ada", "Math pioneer");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/me`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada", bio: "Math pioneer" })
    });
    expect(useAccountsStore.getState().accounts[user.handle]).toEqual(updated);
  });

  it("loads a user account by handle", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(user));

    const result = await useAccountsStore.getState().fetchAccount(user.handle);

    expect(result).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/${user.handle}`, { credentials: "include" });
    expect(useAccountsStore.getState().accounts[user.handle]).toEqual(user);
  });

  it("loads an organization account by handle", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(organization));

    const result = await useAccountsStore.getState().fetchAccount(organization.handle);

    expect(result).toEqual(organization);
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/${organization.handle}`, { credentials: "include" });
    expect(useAccountsStore.getState().accounts[organization.handle]).toEqual(organization);
  });

  it("returns null when loading an account by handle fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Account not found" }, { ok: false, status: 404 }));

    const result = await useAccountsStore.getState().fetchAccount("missing");

    expect(result).toBeNull();
    expect(useAccountsStore.getState().accounts["missing"]).toBeUndefined();
  });

  it("returns an error when updating the user fails", async () => {
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.getState().setAccount(user);
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Invalid profile" }, { ok: false, status: 400 }));

    const result = await useAccountsStore.getState().updateProfile("", "Math pioneer");

    expect(result).toEqual({ ok: false, error: "Invalid profile" });
    expect(useAccountsStore.getState().accounts[user.handle]).toEqual(user);
  });

  it("returns the current user through me()", () => {
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useAccountsStore.getState().setAccount(user);

    expect(useAccountsStore.getState().me()).toEqual(user);
  });

  it("uploads the current account avatar", async () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));

    const result = await uploadCurrentAccountAvatar(file);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/me/avatar`, {
      credentials: "include",
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: expect.any(ArrayBuffer) as unknown
    });
  });

  it("deletes the current account avatar", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));

    const result = await deleteCurrentAccountAvatar();

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/me/avatar`, { credentials: "include", method: "DELETE" });
  });
});
