import type { Project, User } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiBase } from "helpers";
import { useAuthStore } from "stores/auth";
import { buildProjectKey, useProjectStore } from "stores/projects";

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

const project: Project = {
  id: "project-1",
  account: "ada",
  name: "demo",
  description: "Demo project",
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z"
};

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("project store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
    useAuthStore.setState({ user: null, sessionToken: null, status: "idle" });
    useProjectStore.setState({ projectsByKey: {}, isLoading: false, error: null });
    vi.restoreAllMocks();
  });

  it("builds project keys from handle and name", () => {
    expect(buildProjectKey("ada", "demo")).toBe("ada/demo");
  });

  it("fetches projects for a handle with auth headers", async () => {
    useAuthStore.setState({ user, sessionToken: "token-123" });
    fetchMock.mockResolvedValueOnce(createResponse([project]));

    await useProjectStore.getState().fetchProjects("ada");

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/by-handle/ada/projects`, { headers: { Authorization: "Bearer token-123" } });
    expect(useProjectStore.getState().projectsByKey).toEqual({ [buildProjectKey("ada", "demo")]: project });
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBeNull();
  });

  it("fetches public projects without auth headers", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([project]));

    await useProjectStore.getState().fetchProjects("ada");

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/by-handle/ada/projects`, { headers: undefined });
    expect(useProjectStore.getState().projectsByKey).toEqual({ [buildProjectKey("ada", "demo")]: project });
  });

  it("stores the error when the project list request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    await useProjectStore.getState().fetchProjects("ada");

    expect(useProjectStore.getState().error).toBe("Request failed with status 500");
    expect(useProjectStore.getState().isLoading).toBe(false);
  });

  it("stores the error when the project list request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    await useProjectStore.getState().fetchProjects("ada");

    expect(useProjectStore.getState().error).toBe("network error");
    expect(useProjectStore.getState().isLoading).toBe(false);
  });

  it("stores backend errors when fetching a project fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Project not found" }, { ok: false, status: 404 }));

    const result = await useProjectStore.getState().fetchProject("ada", "demo");

    expect(result).toBeNull();
    expect(useProjectStore.getState().error).toBe("Project not found");
    expect(useProjectStore.getState().isLoading).toBe(false);
  });

  it("stores projects by handle and name when fetching succeeds", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(project));

    const result = await useProjectStore.getState().fetchProject("ada", "demo");

    expect(result).toEqual(project);
    expect(useProjectStore.getState().projectsByKey).toEqual({ [buildProjectKey("ada", "demo")]: project });
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBeNull();
  });
});
