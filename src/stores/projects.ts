import { create } from "zustand";

import type { ActionResult } from "helpers";
import { cachedMerge, request, send } from "helpers";
import { useAccountsStore } from "stores/accounts";
import type { Project, Timestamp, User } from "types";

export interface CollaboratorDetails {
  handle: string;
  collaboratorCreatedAt: Timestamp;
  collaboratorUpdatedAt: Timestamp;
}

export type ProjectCollaborator = User & CollaboratorDetails;

interface ProjectState {
  projects: Record<string, Project>;
  collaborators: Record<string, Record<string, CollaboratorDetails>>;
  isLoading: boolean;
  error: string | null;
}

export const useProjectStore = create<ProjectState>(() => ({
  projects: {},
  collaborators: {},
  isLoading: false,
  error: null
}));

export const buildProjectKey = (handle: string, projectName: string): string => `${handle}/${projectName}`;
const indexByKey = (projects: Project[]) => Object.fromEntries(projects.map((project) => [buildProjectKey(project.owner, project.name), project]));
const indexByHandle = <T extends { handle: string }>(items: T[]): Record<string, T> => Object.fromEntries(items.map((item) => [item.handle, item]));

const pickCollaboratorFields = (c: CollaboratorDetails): CollaboratorDetails => (
  { handle: c.handle, collaboratorCreatedAt: c.collaboratorCreatedAt, collaboratorUpdatedAt: c.collaboratorUpdatedAt }
);

const omitCollaboratorFields = <T extends CollaboratorDetails>(c: T): Omit<T, "collaboratorCreatedAt" | "collaboratorUpdatedAt"> => {
  const { collaboratorCreatedAt: _c, collaboratorUpdatedAt: _u, ...rest } = c;
  return rest;
};

// Projects

export const getUserProjects = (handle: string) => (state: ProjectState): Project[] => (
  Object.values(state.projects).filter((p) => p.owner === handle).sort((a, b) => a.name.localeCompare(b.name))
);

const fetchInto = async <T>(url: string, toProjects: (body: T) => Project[]): Promise<T | null> => {
  useProjectStore.setState({ isLoading: true, error: null });
  const { ok, body, error } = await request<T>(url);
  useProjectStore.setState(({ projects }) => ({
    isLoading: false,
    error: ok ? null : error,
    projects: ok ? { ...projects, ...indexByKey(toProjects(body)) } : projects
  }));
  return ok ? body : null;
};

export const fetchProjects = async (handle: string): Promise<void> => {
  await fetchInto<Project[]>(`accounts/${handle}/projects`, (projects) => projects);
};

export const fetchProject = async (handle: string, projectName: string): Promise<Project | null> =>
  await fetchInto<Project>(`accounts/${handle}/projects/${projectName}`, (project) => [project]);

export const updateProject = async (
  handle: string, projectName: string, data: { description?: string | null; metadata?: Record<string, unknown>; visibility?: string }
): Promise<ActionResult<Project>> => {
  const result = await send<Project>(`accounts/${handle}/projects/${projectName}`, "PUT", data as Record<string, unknown>);
  if (!result.ok) { return { ok: false, error: result.error }; }
  useProjectStore.setState(({ projects }) => ({ projects: { ...projects, ...indexByKey([result.body]) } }));
  return { ok: true, body: result.body };
};

export const renameProject = async (handle: string, projectName: string, name: string): Promise<ActionResult<Project>> => {
  const result = await send<Project>(`accounts/${handle}/projects/${projectName}/rename`, "POST", { name });
  if (!result.ok) { return { ok: false, error: result.error }; }
  const oldKey = buildProjectKey(handle, projectName);
  const newKey = buildProjectKey(result.body.owner, result.body.name);
  useProjectStore.setState(({ projects, collaborators }) => {
    const { [oldKey]: _oldProject, ...restProjects } = projects;
    const { [oldKey]: oldCollaborators, ...restCollaborators } = collaborators;
    return {
      projects: { ...restProjects, [newKey]: result.body },
      collaborators: oldCollaborators ? { ...restCollaborators, [newKey]: oldCollaborators } : restCollaborators
    };
  });
  return { ok: true, body: result.body };
};

export const deleteProject = async (handle: string, projectName: string): Promise<ActionResult> => {
  const result = await request<{ status: "ok" }>(`accounts/${handle}/projects/${projectName}`, { method: "DELETE" });
  if (!result.ok) { return { ok: false, error: result.error }; }
  const key = buildProjectKey(handle, projectName);
  useProjectStore.setState(({ projects, collaborators }) => {
    const { [key]: _p, ...nextProjects } = projects;
    const { [key]: _c, ...nextCollaborators } = collaborators;
    return { projects: nextProjects, collaborators: nextCollaborators };
  });
  return { ok: true };
};

// Collaborators

export const getProjectCollaborators = (projectKey: string) => (state: ProjectState): ProjectCollaborator[] => (
  Object.values(state.collaborators[projectKey] ?? {})
    .map((c) => { const a = useAccountsStore.getState().accounts[c.handle]; return a?.type === "USER" ? cachedMerge(a, c) : null; })
    .filter((c): c is ProjectCollaborator => c !== null)
    .sort((a, b) => a.handle.localeCompare(b.handle))
);

export const fetchCollaborators = async (handle: string, projectName: string): Promise<void> => {
  const key = buildProjectKey(handle, projectName);
  const result = await request<ProjectCollaborator[]>(`accounts/${handle}/projects/${projectName}/collaborators`);
  if (result.ok) {
    useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, ...indexByHandle(result.body.map(omitCollaboratorFields)) } }));
    useProjectStore.setState((state) => ({ collaborators: { ...state.collaborators, [key]: indexByHandle(result.body.map(pickCollaboratorFields)) } }));
  }
};

export const addCollaborator = async (
  handle: string, projectName: string, userHandle: string
): Promise<ActionResult> => {
  const result = await request(
    `accounts/${handle}/projects/${projectName}/collaborators/${userHandle}`, { method: "PUT" },
  );
  if (result.ok) {
    void fetchCollaborators(handle, projectName);
    return { ok: true };
  }
  return { ok: false, error: result.error };
};

export const removeCollaborator = async (
  handle: string, projectName: string, userHandle: string
): Promise<ActionResult> => {
  const result = await request(
    `accounts/${handle}/projects/${projectName}/collaborators/${userHandle}`, { method: "DELETE" },
  );
  if (result.ok) {
    const key = buildProjectKey(handle, projectName);
    useProjectStore.setState((state) => {
      const details = state.collaborators[key];
      if (!details) { return state; }
      const { [userHandle]: _, ...rest } = details;
      return { collaborators: { ...state.collaborators, [key]: rest } };
    });
    return { ok: true };
  }
  return { ok: false, error: result.error };
};
