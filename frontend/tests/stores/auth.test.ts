import { API_VERSION } from "@underfit/types";
import type { User } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "store/auth";

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

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

  it("stores the session token and updates state", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    useAuthStore.getState().setSessionToken("token-abc");

    expect(setItemSpy).toHaveBeenCalledWith("underfitSessionToken", "token-abc");
    expect(localStorage.getItem("underfitSessionToken")).toBe("token-abc");
    expect(useAuthStore.getState().sessionToken).toBe("token-abc");
  });

  it("sets unauthenticated when loading without a token", async () => {
    useAuthStore.setState({ user, sessionToken: null, status: "authenticated" });

    await useAuthStore.getState().loadUser();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().user).toBeNull();
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

  it("updates auth status when setting the user", () => {
    useAuthStore.getState().setUser(user);

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user).toEqual(user);

    useAuthStore.getState().setUser(null);

    expect(useAuthStore.getState().status).toBe("unauthenticated");
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("clears auth state and session storage", () => {
    localStorage.setItem("underfitSessionToken", "token-123");
    useAuthStore.setState({ user, sessionToken: "token-123", status: "authenticated" });

    useAuthStore.getState().clearAuth();

    expect(localStorage.getItem("underfitSessionToken")).toBeNull();
    expect(useAuthStore.getState().sessionToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().status).toBe("idle");
  });
});
