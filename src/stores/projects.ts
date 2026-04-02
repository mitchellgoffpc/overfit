import { create } from "zustand";

import type { ActionResult } from "helpers";
import { request, send } from "helpers";
import type { Project, User } from "types";

export const buildProjectKey = (handle: string, projectName: string): string => `${handle}/${projectName}`;
const getProjectsByKey = (projects: Project[]) => Object.fromEntries(projects.map((project) => [buildProjectKey(project.owner, project.name), project]));

interface ProjectState {
  projectsByKey: Record<string, Project>;
  collaboratorsByKey: Record<string, User[]>;
  isLoading: boolean;
  error: string | null;
  fetchProjects: (handle: string) => Promise<void>;
  fetchProject: (handle: string, projectName: string) => Promise<Project | null>;
  fetchCollaborators: (handle: string, projectName: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectsByKey: {},
  collaboratorsByKey: {},
  isLoading: false,
  error: null,

  fetchProjects: async (handle: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Project[]>(`accounts/${handle}/projects`);
    if (ok) {
      set(({ projectsByKey }) => ({ isLoading: false, error: null, projectsByKey: { ...projectsByKey, ...getProjectsByKey(body) } }));
    } else {
      set({ error, isLoading: false });
    }
  },

  fetchProject: async (handle: string, projectName: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Project>(`accounts/${handle}/projects/${projectName}`);
    if (ok) {
      set(({ projectsByKey }) => ({
        error: null, isLoading: false, projectsByKey: { ...projectsByKey, ...getProjectsByKey([body]) },
      }));
      return body;
    } else {
      set({ error, isLoading: false });
      return null;
    }
  },

  fetchCollaborators: async (handle: string, projectName: string) => {
    const key = buildProjectKey(handle, projectName);
    const result = await request<User[]>(`accounts/${handle}/projects/${projectName}/collaborators`);
    if (result.ok) {
      set(({ collaboratorsByKey }) => ({ collaboratorsByKey: { ...collaboratorsByKey, [key]: result.body } }));
    }
  },
}));

export const searchUsers = async (query: string): Promise<ActionResult<User[]>> => {
  const normalized = query.trim();
  if (!normalized) { return { ok: true, body: [] }; }
  const result = await request<User[]>(`users/search?query=${encodeURIComponent(normalized)}`);
  return result.ok ? { ok: true, body: result.body } : { ok: false, error: result.error };
};

export const updateProject = async (
  handle: string, projectName: string, data: { description?: string | null; visibility?: string }
): Promise<ActionResult<Project>> => {
  const result = await send<Project>(
    `accounts/${handle}/projects/${projectName}`, "PUT", data as Record<string, unknown>,
  );
  if (result.ok) {
    useProjectStore.setState(({ projectsByKey }) => ({
      projectsByKey: { ...projectsByKey, ...getProjectsByKey([result.body]) },
    }));
    return { ok: true, body: result.body };
  }
  return { ok: false, error: result.error };
};

export const renameProject = async (
  handle: string, projectName: string, name: string
): Promise<ActionResult<Project>> => {
  const result = await send<Project>(`accounts/${handle}/projects/${projectName}/rename`, "POST", { name });
  if (result.ok) {
    const oldKey = buildProjectKey(handle, projectName);
    const newKey = buildProjectKey(result.body.owner, result.body.name);
    useProjectStore.setState(({ projectsByKey, collaboratorsByKey }) => {
      if (oldKey === newKey) { return { projectsByKey: { ...projectsByKey, [newKey]: result.body }, collaboratorsByKey }; }
      const nextProjectsByKey = {
        ...Object.fromEntries(Object.entries(projectsByKey).filter(([projectKey]) => projectKey !== oldKey)),
        [newKey]: result.body
      };
      const oldCollaborators = collaboratorsByKey[oldKey];
      const filteredCollaboratorsByKey = Object.fromEntries(
        Object.entries(collaboratorsByKey).filter(([projectKey]) => projectKey !== oldKey),
      );
      const nextCollaboratorsByKey = oldCollaborators ? { ...filteredCollaboratorsByKey, [newKey]: oldCollaborators } : filteredCollaboratorsByKey;
      return { projectsByKey: nextProjectsByKey, collaboratorsByKey: nextCollaboratorsByKey };
    });
    return { ok: true, body: result.body };
  }
  return { ok: false, error: result.error };
};

export const deleteProject = async (handle: string, projectName: string): Promise<ActionResult> => {
  const result = await request<{ status: "ok" }>(`accounts/${handle}/projects/${projectName}`, { method: "DELETE" });
  if (result.ok) {
    const key = buildProjectKey(handle, projectName);
    useProjectStore.setState(({ projectsByKey, collaboratorsByKey }) => {
      const nextProjectsByKey = Object.fromEntries(Object.entries(projectsByKey).filter(([projectKey]) => projectKey !== key));
      const nextCollaboratorsByKey = Object.fromEntries(Object.entries(collaboratorsByKey).filter(([projectKey]) => projectKey !== key));
      return { projectsByKey: nextProjectsByKey, collaboratorsByKey: nextCollaboratorsByKey };
    });
    return { ok: true };
  }
  return { ok: false, error: result.error };
};

export const addCollaborator = async (
  handle: string, projectName: string, userHandle: string
): Promise<ActionResult> => {
  const result = await request(
    `accounts/${handle}/projects/${projectName}/collaborators/${userHandle}`, { method: "PUT" },
  );
  if (result.ok) {
    void useProjectStore.getState().fetchCollaborators(handle, projectName);
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
    useProjectStore.setState(({ collaboratorsByKey }) => ({
      collaboratorsByKey: {
        ...collaboratorsByKey,
        [key]: (collaboratorsByKey[key] ?? []).filter((u) => u.handle !== userHandle),
      },
    }));
    return { ok: true };
  }
  return { ok: false, error: result.error };
};
