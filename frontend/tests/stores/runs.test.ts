import type { Project, Run } from "@underfit/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiBase } from "helpers";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { buildRunKey, useRunStore } from "stores/runs";

const project: Project = {
  id: "project-1",
  owner: "ada",
  name: "demo",
  description: "Demo project",
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z"
};

const run: Run = {
  id: "run-1",
  projectId: "project-1",
  user: "ada",
  projectName: "demo",
  projectOwner: "ada",
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
    useProjectStore.setState({ projectsByKey: {}, isLoading: false, error: null });
    useRunStore.setState({ runsByKey: {}, isLoading: false, error: null });
    vi.restoreAllMocks();
  });

  it("builds run keys from handle, project, and run names", () => {
    expect(buildRunKey("ada", "demo", "run-a")).toBe("ada/demo/run-a");
  });

  it("stores runs keyed by handle and project name when fetching succeeds", async () => {
    useProjectStore.setState({ projectsByKey: { [buildProjectKey("ada", "demo")]: project } });
    const otherRun: Run = { ...run, id: "run-2", projectId: "project-2", projectName: "other", name: "run-b" };
    fetchMock.mockResolvedValueOnce(createResponse([run, otherRun]));

    await useRunStore.getState().fetchRuns("ada");

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/users/ada/runs`, { credentials: "include" });
    expect(useRunStore.getState().runsByKey).toEqual({
      [buildRunKey("ada", "demo", "run-a")]: run,
      [buildRunKey("ada", "other", "run-b")]: otherRun
    });
    expect(useRunStore.getState().isLoading).toBe(false);
    expect(useRunStore.getState().error).toBeNull();
  });

  it("stores the error when the run list request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    await useRunStore.getState().fetchRuns("ada");

    expect(useRunStore.getState().error).toBe("Request failed with status 500");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("stores the error when the run list request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    await useRunStore.getState().fetchRuns("ada");

    expect(useRunStore.getState().error).toBe("network error");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("fetches project runs and merges them by run key", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([run]));

    await useRunStore.getState().fetchProjectRuns("ada", "demo");

    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/accounts/ada/projects/demo/runs`, { credentials: "include" });
    expect(useRunStore.getState().runsByKey).toEqual({ [buildRunKey("ada", "demo", "run-a")]: run });
    expect(useRunStore.getState().isLoading).toBe(false);
    expect(useRunStore.getState().error).toBeNull();
  });

  it("stores backend errors when fetching a run fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Run not found" }, { ok: false, status: 404 }));

    const result = await useRunStore.getState().fetchRun("ada", "demo", "run-a");

    expect(result).toBeNull();
    expect(useRunStore.getState().error).toBe("Run not found");
    expect(useRunStore.getState().isLoading).toBe(false);
  });

  it("stores runs by handle and name when fetching succeeds", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(run));

    const result = await useRunStore.getState().fetchRun("ada", "demo", "run-a");

    expect(result).toEqual(run);
    expect(useRunStore.getState().runsByKey).toEqual({ [buildRunKey("ada", "demo", "run-a")]: run });
    expect(useRunStore.getState().isLoading).toBe(false);
    expect(useRunStore.getState().error).toBeNull();
  });

  it("merges fetched runs with existing entries", async () => {
    const existingRun: Run = { ...run, id: "run-2", name: "baseline", projectId: "project-1" };
    useProjectStore.setState({ projectsByKey: { [buildProjectKey("ada", "demo")]: project } });
    useRunStore.setState({ runsByKey: { [buildRunKey("ada", "demo", "baseline")]: existingRun }, isLoading: false, error: "stale error" });
    fetchMock.mockResolvedValueOnce(createResponse([run]));

    await useRunStore.getState().fetchRuns("ada");

    expect(useRunStore.getState().runsByKey).toEqual({
      [buildRunKey("ada", "demo", "baseline")]: existingRun,
      [buildRunKey("ada", "demo", "run-a")]: run
    });
    expect(useRunStore.getState().error).toBeNull();
  });
});
