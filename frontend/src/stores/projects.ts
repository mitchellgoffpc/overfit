import type { Project } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";

export const buildProjectKey = (handle: string, projectName: string): string => `${handle}/${projectName}`;
const getProjectsByKey = (projects: Project[]) => Object.fromEntries(projects.map((project) => [buildProjectKey(project.owner, project.name), project]));

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
      set(({ projectsByKey }) => ({ error: null, isLoading: false, projectsByKey: { ...projectsByKey, ...getProjectsByKey([body]) } }));
      return body;
    } else {
      set({ error, isLoading: false });
      return null;
    }
  }
}));
