import { API_VERSION, EMAIL_IN_USE_ERROR, USERNAME_IN_USE_ERROR } from "@underfit/types";
import type { User } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkEmailValid, checkHandleValid, useAuthStore } from "store/auth";

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

const user: User = {
  id: "user-1",
  handle: "ada",
  displayName: "Ada Lovelace",
  type: "USER",
  email: "ada@underfit.local",
  name: "Ada Lovelace",
  bio: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z"
};

describe("auth store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
    useAuthStore.setState({ user: null, sessionToken: null, status: "idle" });
    vi.restoreAllMocks();
  });

  it("initializes session token from localStorage", async () => {
    localStorage.setItem("underfitSessionToken", "token-123");
    vi.resetModules();

    const { useAuthStore: freshStore } = await import("store/auth");

    expect(freshStore.getState().sessionToken).toBe("token-123");
  });

  it("sets unauthenticated when loading without a token", async () => {
    useAuthStore.setState({ user, sessionToken: null, status: "authenticated" });

    await useAuthStore.getState().loadUser();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logs in and stores the session data", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ session: { token: "token-123" }, user }));

    const result = await useAuthStore.getState().login("ada@underfit.local", "password");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ada@underfit.local", password: "password" })
    });
    expect(useAuthStore.getState().sessionToken).toBe("token-123");
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("returns an error when login fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Invalid credentials" }, { ok: false, status: 401 }));

    const result = await useAuthStore.getState().login("ada@underfit.local", "password");

    expect(result).toEqual({ ok: false, error: "Invalid credentials" });
  });

  it("registers a new user and stores the session data", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ session: { token: "token-456" }, user }));

    const result = await useAuthStore.getState().signup("ada@underfit.local", "ada", "password");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ada@underfit.local", handle: "ada", password: "password" })
    });
    expect(useAuthStore.getState().sessionToken).toBe("token-456");
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("returns a conflict error when email is already in use", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ exists: true }));

    const result = await checkEmailValid("ada@underfit.local");

    expect(result).toBe(EMAIL_IN_USE_ERROR);
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/email-exists?email=ada%40underfit.local`);
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
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/handle-exists?handle=ada`);
  });

  it("loads the user with a valid token", async () => {
    useAuthStore.setState({ user: null, sessionToken: "token-123", status: "idle" });
    fetchMock.mockResolvedValueOnce({ ok: true, json: vi.fn(async () => await Promise.resolve(user)) });

    await useAuthStore.getState().loadUser();

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/me`, { headers: { Authorization: "Bearer token-123" } });
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("sets unauthenticated when the user request fails", async () => {
    useAuthStore.setState({ user: null, sessionToken: "token-123", status: "idle" });
    fetchMock.mockResolvedValueOnce({ ok: false });

    await useAuthStore.getState().loadUser();

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("sets unauthenticated when the user request throws", async () => {
    useAuthStore.setState({ user: null, sessionToken: "token-123", status: "idle" });
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    await useAuthStore.getState().loadUser();

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("logs out and clears auth state", async () => {
    localStorage.setItem("underfitSessionToken", "token-123");
    useAuthStore.setState({ user, sessionToken: "token-123", status: "authenticated" });
    fetchMock.mockResolvedValueOnce(createResponse({}));

    await useAuthStore.getState().logout();

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/auth/logout`, { method: "POST", headers: { Authorization: "Bearer token-123" } });
    expect(localStorage.getItem("underfitSessionToken")).toBeNull();
    expect(useAuthStore.getState().sessionToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("idle");
  });

  it("updates the user profile", async () => {
    const updated = { ...user, name: "Ada", bio: "Math pioneer" };
    useAuthStore.setState({ user, sessionToken: "token-123", status: "authenticated" });
    fetchMock.mockResolvedValueOnce(createResponse(updated));

    const result = await useAuthStore.getState().updateUserProfile("Ada", "Math pioneer");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/me`, {
      method: "PATCH",
      headers: { Authorization: "Bearer token-123", "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada", bio: "Math pioneer" })
    });
    expect(useAuthStore.getState().user).toEqual(updated);
  });
});
