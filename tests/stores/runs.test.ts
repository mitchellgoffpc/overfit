import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildProjectKey, useProjectStore } from "stores/projects";
import { buildRunKey, fetchRun, fetchRuns, useRunStore } from "stores/runs";
import { API_BASE } from "types";
import type { Project, Run } from "types";

const project: Project = {
  id: "project-1",
  owner: "ada",
  name: "demo",
  description: "Demo project",
  metadata: {},
  visibility: "private",
  pendingTransferTo: null,
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z"
};

const run: Run = {
  id: "run-1",
  projectId: "project-1",
  user: "ada",
  projectName: "demo",
  projectOwner: "ada",
  launchId: "launch-1",
  name: "run-a",
  terminalState: null,
  isActive: true,
  createdAt: "2025-01-02T00:00:00.000Z",
  updatedAt: "2025-01-03T00:00:00.000Z",
  config: null,
  metadata: {},
  workerToken: null
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
    useProjectStore.setState({ projects: {}, isLoading: false, error: null });
    useRunStore.setState({ runs: {}, isLoading: {}, errors: {} });
    vi.restoreAllMocks();
  });

  it("builds run keys from handle, project, and run names", () => {
    expect(buildRunKey("ada", "demo", "run-a")).toBe("ada/demo/run-a");
  });

  it("stores runs keyed by handle and project name when fetching succeeds", async () => {
    useProjectStore.setState({ projects: { [buildProjectKey("ada", "demo")]: project } });
    const otherRun: Run = { ...run, id: "run-2", projectId: "project-2", projectName: "other", name: "run-b" };
    fetchMock.mockResolvedValueOnce(createResponse([run, otherRun]));

    await fetchRuns("ada");

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/users/ada/runs`, { credentials: "include" });
    expect(useRunStore.getState().runs).toEqual({
      [buildRunKey("ada", "demo", "run-a")]: run,
      [buildRunKey("ada", "other", "run-b")]: otherRun
    });
    expect(useRunStore.getState().isLoading["ada"]).toBe(false);
    expect(useRunStore.getState().errors["ada"]).toBeNull();
  });

  it("stores the error when the run list request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    await fetchRuns("ada");

    expect(useRunStore.getState().errors["ada"]).toBe("Request failed with status 500");
    expect(useRunStore.getState().isLoading["ada"]).toBe(false);
  });

  it("stores the error when the run list request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    await fetchRuns("ada");

    expect(useRunStore.getState().errors["ada"]).toBe("network error");
    expect(useRunStore.getState().isLoading["ada"]).toBe(false);
  });

  it("fetches project runs and merges them by run key", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([run]));

    await fetchRuns("ada", "demo");

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/accounts/ada/projects/demo/runs`, { credentials: "include" });
    expect(useRunStore.getState().runs).toEqual({ [buildRunKey("ada", "demo", "run-a")]: run });
    expect(useRunStore.getState().isLoading[buildProjectKey("ada", "demo")]).toBe(false);
    expect(useRunStore.getState().errors[buildProjectKey("ada", "demo")]).toBeNull();
  });

  it("stores backend errors when fetching a run fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Run not found" }, { ok: false, status: 404 }));

    const result = await fetchRun("ada", "demo", "run-a");

    expect(result).toBeNull();
    expect(useRunStore.getState().errors[buildRunKey("ada", "demo", "run-a")]).toBe("Run not found");
    expect(useRunStore.getState().isLoading[buildRunKey("ada", "demo", "run-a")]).toBe(false);
  });

  it("stores runs by handle and name when fetching succeeds", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(run));

    const result = await fetchRun("ada", "demo", "run-a");

    expect(result).toEqual(run);
    expect(useRunStore.getState().runs).toEqual({ [buildRunKey("ada", "demo", "run-a")]: run });
    expect(useRunStore.getState().isLoading[buildRunKey("ada", "demo", "run-a")]).toBe(false);
    expect(useRunStore.getState().errors[buildRunKey("ada", "demo", "run-a")]).toBeNull();
  });

  it("merges fetched runs with existing entries", async () => {
    const existingRun: Run = { ...run, id: "run-2", name: "baseline", projectId: "project-1" };
    useProjectStore.setState({ projects: { [buildProjectKey("ada", "demo")]: project } });
    useRunStore.setState({
      runs: { [buildRunKey("ada", "demo", "baseline")]: existingRun },
      isLoading: {},
      errors: { ada: "stale error" }
    });
    fetchMock.mockResolvedValueOnce(createResponse([run]));

    await fetchRuns("ada");

    expect(useRunStore.getState().runs).toEqual({
      [buildRunKey("ada", "demo", "baseline")]: existingRun,
      [buildRunKey("ada", "demo", "run-a")]: run
    });
    expect(useRunStore.getState().errors["ada"]).toBeNull();
  });
});
