import type { Project } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";

export const buildProjectKey = (handle: string, projectName: string): string => `${handle}/${projectName}`;

interface ProjectState {
  projectsByKey: Record<string, Project>;
  isLoading: boolean;
  error: string | null;
  fetchProjects: (handle: string) => Promise<void>;
  fetchProject: (handle: string, projectName: string) => Promise<Project | null>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projectsByKey: {},
  isLoading: false,
  error: null,

  fetchProjects: async (handle: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Project[]>(`accounts/by-handle/${handle}/projects`);
    if (ok) {
      set(({ projectsByKey }) => {
        const newProjects = Object.fromEntries(body.map((project) => [buildProjectKey(handle, project.name), project]));
        return { isLoading: false, error: null, projectsByKey: { ...projectsByKey, ...newProjects } };
      });
    } else {
      set({ error, isLoading: false });
    }
  },

  fetchProject: async (handle: string, projectName: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Project>(`accounts/by-handle/${handle}/projects/${projectName}`);
    if (ok) {
      set(({ projectsByKey }) => ({ error: null, isLoading: false, projectsByKey: { ...projectsByKey, [buildProjectKey(handle, projectName)]: body } }));
      return body;
    } else {
      set({ error, isLoading: false });
      return null;
    }
  }
}));
