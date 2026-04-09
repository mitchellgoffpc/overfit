import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CollaboratorDetails } from "stores/projects";
import { buildProjectKey, deleteProject, fetchProject, fetchProjects, renameProject, useProjectStore } from "stores/projects";
import { API_BASE } from "types";
import type { Project } from "types";

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

const createResponse = (body: unknown, init?: { ok?: boolean; status?: number }) => ({
  ok: init?.ok ?? true,
  status: init?.status ?? 200,
  json: vi.fn(async () => await Promise.resolve(body))
});

const collaborator: CollaboratorDetails = {
  handle: "grace",
  collaboratorCreatedAt: "2025-01-01T00:00:00.000Z",
  collaboratorUpdatedAt: "2025-01-01T00:00:00.000Z"
};

describe("project store", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    useProjectStore.setState({ projects: {}, collaborators: {}, isLoading: false, error: null });
    vi.restoreAllMocks();
  });

  it("builds project keys from handle and name", () => {
    expect(buildProjectKey("ada", "demo")).toBe("ada/demo");
  });

  it("fetches projects for a handle with cookie credentials", async () => {
    fetchMock.mockResolvedValueOnce(createResponse([project]));

    await fetchProjects("ada");

    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/accounts/ada/projects`, { credentials: "include" });
    expect(useProjectStore.getState().projects).toEqual({ [buildProjectKey("ada", "demo")]: project });
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBeNull();
  });

  it("stores the error when the project list request fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({}, { ok: false, status: 500 }));

    await fetchProjects("ada");

    expect(useProjectStore.getState().error).toBe("Request failed with status 500");
    expect(useProjectStore.getState().isLoading).toBe(false);
  });

  it("stores the error when the project list request throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network error"));

    await fetchProjects("ada");

    expect(useProjectStore.getState().error).toBe("network error");
    expect(useProjectStore.getState().isLoading).toBe(false);
  });

  it("stores backend errors when fetching a project fails", async () => {
    fetchMock.mockResolvedValueOnce(createResponse({ error: "Project not found" }, { ok: false, status: 404 }));

    const result = await fetchProject("ada", "demo");

    expect(result).toBeNull();
    expect(useProjectStore.getState().error).toBe("Project not found");
    expect(useProjectStore.getState().isLoading).toBe(false);
  });

  it("stores projects by handle and name when fetching succeeds", async () => {
    fetchMock.mockResolvedValueOnce(createResponse(project));

    const result = await fetchProject("ada", "demo");

    expect(result).toEqual(project);
    expect(useProjectStore.getState().projects).toEqual({ [buildProjectKey("ada", "demo")]: project });
    expect(useProjectStore.getState().isLoading).toBe(false);
    expect(useProjectStore.getState().error).toBeNull();
  });

  it("merges fetched project lists with existing entries", async () => {
    const existing: Project = { ...project, id: "project-2", name: "baseline" };
    useProjectStore.setState({ projects: { [buildProjectKey("ada", "baseline")]: existing }, isLoading: false, error: "stale error" });
    fetchMock.mockResolvedValueOnce(createResponse([project]));

    await fetchProjects("ada");

    expect(useProjectStore.getState().projects).toEqual({
      [buildProjectKey("ada", "baseline")]: existing,
      [buildProjectKey("ada", "demo")]: project
    });
    expect(useProjectStore.getState().error).toBeNull();
  });

  it("renames a project and rewrites project and collaborator keys", async () => {
    const renamed = { ...project, name: "renamed" };
    useProjectStore.setState({
      projects: { [buildProjectKey("ada", "demo")]: project },
      collaborators: { [buildProjectKey("ada", "demo")]: { [collaborator.handle]: collaborator } }
    });
    fetchMock.mockResolvedValueOnce(createResponse(renamed));

    const result = await renameProject("ada", "demo", "renamed");

    expect(result).toEqual({ ok: true, body: renamed });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/accounts/ada/projects/demo/rename`, {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "renamed" })
    });
    expect(useProjectStore.getState().projects).toEqual({ [buildProjectKey("ada", "renamed")]: renamed });
    expect(useProjectStore.getState().collaborators).toEqual({ [buildProjectKey("ada", "renamed")]: { [collaborator.handle]: collaborator } });
  });

  it("deletes a project and removes its collaborators from state", async () => {
    const sibling = { ...project, id: "project-2", name: "baseline" };
    useProjectStore.setState({
      projects: { [buildProjectKey("ada", "demo")]: project, [buildProjectKey("ada", "baseline")]: sibling },
      collaborators: { [buildProjectKey("ada", "demo")]: { [collaborator.handle]: collaborator } }
    });
    fetchMock.mockResolvedValueOnce(createResponse({ status: "ok" }));

    const result = await deleteProject("ada", "demo");

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE}/accounts/ada/projects/demo`, { credentials: "include", method: "DELETE" });
    expect(useProjectStore.getState().projects).toEqual({ [buildProjectKey("ada", "baseline")]: sibling });
    expect(useProjectStore.getState().collaborators).toEqual({});
  });
});
