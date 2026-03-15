import { API_VERSION } from "@underfit/types";
import type { User } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteCurrentUserAvatar, uploadCurrentUserAvatar, useUsersStore } from "stores/users";

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

describe("users store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useUsersStore.setState({ user: null, status: "idle" });
    vi.restoreAllMocks();
  });

  it("loads the user from the session cookie", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(user));

    await useUsersStore.getState().loadUser();

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/me`, { credentials: "include" });
    expect(useUsersStore.getState().status).toBe("authenticated");
    expect(useUsersStore.getState().user).toEqual(user);
  });

  it("sets unauthenticated when the user request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 401 }));

    await useUsersStore.getState().loadUser();

    expect(useUsersStore.getState().status).toBe("unauthenticated");
    expect(useUsersStore.getState().user).toBeNull();
  });

  it("updates the user", async () => {
    const updated = { ...user, name: "Ada", bio: "Math pioneer" };
    useUsersStore.setState({ user, status: "authenticated" });
    fetchMock.mockResolvedValueOnce(createResponse(updated));

    const result = await useUsersStore.getState().updateUser("Ada", "Math pioneer");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/me`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Ada", bio: "Math pioneer" })
    });
    expect(useUsersStore.getState().user).toEqual(updated);
  });

  it("returns an error when updating the user fails", async () => {
    useUsersStore.setState({ user, status: "authenticated" });
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Invalid profile" }, { ok: false, status: 400 }));

    const result = await useUsersStore.getState().updateUser("", "Math pioneer");

    expect(result).toEqual({ ok: false, error: "Invalid profile" });
    expect(useUsersStore.getState().user).toEqual(user);
    expect(useUsersStore.getState().status).toBe("authenticated");
  });

  it("uploads the current user avatar", async () => {
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));

    const result = await uploadCurrentUserAvatar(file);

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/me/avatar`, {
      credentials: "include",
      method: "PUT",
      headers: { "Content-Type": "image/png" },
      body: expect.any(ArrayBuffer) as unknown
    });
  });

  it("deletes the current user avatar", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));

    const result = await deleteCurrentUserAvatar();

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/me/avatar`, { credentials: "include", method: "DELETE" });
  });
});
