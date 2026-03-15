import { API_VERSION, EMAIL_IN_USE_ERROR, USERNAME_IN_USE_ERROR } from "@underfit/types";
import type { User } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkEmailValid, checkHandleValid, useAuthStore } from "stores/auth";
import { useUsersStore } from "stores/users";

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

describe("auth store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useAuthStore.setState({ status: "idle", currentHandle: null });
    useUsersStore.setState({ users: {} });
    vi.restoreAllMocks();
  });

  it("logs in and stores the user", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ session: { token: "token-123" }, user }));

    const result = await useAuthStore.getState().login("ada@underfit.local", "password");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/login`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ada@underfit.local", password: "password" })
    });
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().currentHandle).toBe(user.handle);
    expect(useUsersStore.getState().users[user.handle]).toEqual(user);
  });

  it("returns an error when login fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Invalid credentials" }, { ok: false, status: 401 }));

    const result = await useAuthStore.getState().login("ada@underfit.local", "password");

    expect(result).toEqual({ ok: false, error: "Invalid credentials" });
  });

  it("registers a new user and stores the user", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ session: { token: "token-456" }, user }));

    const result = await useAuthStore.getState().signup("ada@underfit.local", "ada", "password");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/register`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ada@underfit.local", handle: "ada", password: "password" })
    });
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().currentHandle).toBe(user.handle);
    expect(useUsersStore.getState().users[user.handle]).toEqual(user);
  });

  it("returns a conflict error when email is already in use", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ exists: true }));

    const result = await checkEmailValid("ada@underfit.local");

    expect(result).toBe(EMAIL_IN_USE_ERROR);
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/emails/exists?email=ada%40underfit.local`, { credentials: "include" });
  });

  it("returns early when email is blank or invalid", async () => {
    expect(await checkEmailValid("   ")).toBeNull();
    expect(await checkEmailValid("not-an-email")).toBe("Invalid email address");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error when handle availability checks fail", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    const result = await checkHandleValid("ada");

    expect(result).toBe("Request failed with status 500");
  });

  it("returns a conflict error when handle is already in use", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ exists: true }));

    const result = await checkHandleValid("ada");

    expect(result).toBe(USERNAME_IN_USE_ERROR);
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/ada/exists`, { credentials: "include" });
  });

  it("returns early when handle is blank or invalid", async () => {
    expect(await checkHandleValid("   ")).toBeNull();
    expect(await checkHandleValid("-ada")).toBe(
      "Username may only contain alphanumeric characters or single hyphens, and cannot begin or end with a hyphen."
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs out and clears user state", async () => {
    useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
    useUsersStore.getState().setUser(user);
    fetchMock.mockResolvedValueOnce(createResponse({}));

    await useAuthStore.getState().logout();

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/logout`, { credentials: "include", method: "POST" });
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().currentHandle).toBeNull();
    expect(useUsersStore.getState().users[user.handle]).toEqual(user);
  });

  it("skips logout request when not authenticated", async () => {
    useAuthStore.setState({ status: "unauthenticated", currentHandle: null });

    await useAuthStore.getState().logout();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
  });
});
