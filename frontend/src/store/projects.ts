import type { Project } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";
import { useAuthStore } from "store/auth";

export const buildProjectKey = (handle: string, projectName: string): string => `${handle}/${projectName}`;

interface ProjectState {
  projectsByKey: Record<string, Project>;
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  fetchProjectByHandle: (handle: string, projectName: string) => Promise<Project | null>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectsByKey: {},
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const handle = useAuthStore.getState().user?.handle;
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;
    const endpoint = sessionToken ? "projects/me" : "projects";

    const { ok, body, error } = await request<Project[]>(endpoint, { headers });
    if (!ok) {
      set({ error, isLoading: false });
      return;
    }

    set((state) => {
      const next = { ...state.projectsByKey };
      if (handle) {
        body.forEach((project) => {
          next[buildProjectKey(handle, project.name)] = project;
        });
      }
      return { projectsByKey: next, isLoading: false, error: null };
    });
  },

  fetchProjectByHandle: async (handle: string, projectName: string) => {
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

    const { ok, body, error } = await request<Project>(`accounts/by-handle/${handle}/projects/${projectName}`, { headers });
    if (!ok) {
      set({ error, isLoading: false });
      return null;
    }

    set(({ projectsByKey }) => ({ error: null, isLoading: false, projectsByKey: { ...projectsByKey, [buildProjectKey(handle, projectName)]: body } }));
    return body;
  }
}));
