import type { Project, Run, User } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiBase } from "helpers";
import { useAuthStore } from "store/auth";
import { buildProjectKey, useProjectStore } from "store/projects";
import { buildRunKey, useRunStore } from "store/runs";

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
  accountId: "acct-1",
  name: "demo",
  description: "Demo project",
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z"
};

const run: Run = {
  id: "run-1",
  projectId: "project-1",
  userId: "user-1",
  name: "run-a",
  status: "running",
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z",
  metadata: null
};

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

describe("run store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
    useAuthStore.setState({ user: null, sessionToken: null, status: "idle" });
    useProjectStore.setState({ projectsByKey: {}, isLoading: false, error: null });
    useRunStore.setState({ runsByKey: {}, isLoading: false, error: null });
    vi.restoreAllMocks();
  });

  it("builds run keys from handle, project, and run names", () => {
    expect(buildRunKey("ada", "demo", "run-a")).toBe("ada/demo/run-a");
  });

  it("rejects run fetches without a user id", async () => {
    await useRunStore.getState().fetchRuns("");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useRunStore.getState().error).toBe("Missing user id");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("stores runs keyed by handle and project name when fetching succeeds", async () => {
    useAuthStore.setState({ user, sessionToken: "token-123" });
    useProjectStore.setState({ projectsByKey: { [buildProjectKey("ada", "demo")]: project } });
    const otherRun: Run = { ...run, id: "run-2", projectId: "project-2", name: "run-b" };
    fetchMock.mockResolvedValueOnce(createResponse([run, otherRun]));

    await useRunStore.getState().fetchRuns("user-1");

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/user-1/runs`, { headers: { Authorization: "Bearer token-123" } });
    expect(useRunStore.getState().runsByKey).toEqual({ [buildRunKey("ada", "demo", "run-a")]: run });
    expect(useRunStore.getState().isLoading).toBe(false);
    expect(useRunStore.getState().error).toBeNull();
  });

  it("stores the error when the run list request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    await useRunStore.getState().fetchRuns("user-1");

    expect(useRunStore.getState().error).toBe("Failed to fetch runs (500)");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("stores the error when the run list request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    await useRunStore.getState().fetchRuns("user-1");

    expect(useRunStore.getState().error).toBe("network error");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("rejects run lookups without required params", async () => {
    const result = await useRunStore.getState().fetchRunByHandle("", "", "");

    expect(result).toBeNull();
    expect(useRunStore.getState().error).toBe("Missing run lookup params");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("stores backend errors when fetching a run fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Run not found" }, { ok: false, status: 404 }));

    const result = await useRunStore.getState().fetchRunByHandle("ada", "demo", "run-a");

    expect(result).toBeNull();
    expect(useRunStore.getState().error).toBe("Run not found");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("stores runs by handle and name when fetching succeeds", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(run));

    const result = await useRunStore.getState().fetchRunByHandle("ada", "demo", "run-a");

    expect(result).toEqual(run);
    expect(useRunStore.getState().runsByKey).toEqual({ [buildRunKey("ada", "demo", "run-a")]: run });
    expect(useRunStore.getState().isLoading).toBe(false);
    expect(useRunStore.getState().error).toBeNull();
  });
});
