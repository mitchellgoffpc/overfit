import type { Project } from "@underfit/types";
import { create } from "zustand";

import { apiBase } from "helpers";
import { useAuthStore } from "store/auth";

const buildProjectKey = (handle: string, projectName: string): string => `${handle}/${projectName}`;
const getErrorMessage = (body: unknown): string | null => {
  if (!body || typeof body !== "object") { return null; }
  if (!("error" in body)) { return null; }
  const errorValue = body.error;
  return typeof errorValue === "string" ? errorValue : null;
};

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

    try {
      const response = await fetch(`${apiBase}/${endpoint}`, { headers });

      if (!response.ok) {
        set({ error: `Failed to fetch projects (${String(response.status)})`, isLoading: false });
        return;
      }

      const projects = (await response.json()) as Project[];
      set((state) => {
        const next = { ...state.projectsByKey };
        if (handle) {
          projects.forEach((project) => {
            next[buildProjectKey(handle, project.name)] = project;
          });
        }
        return { projectsByKey: next, isLoading: false, error: null };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch projects";
      set({ error: message, isLoading: false });
    }
  },
  fetchProjectByHandle: async (handle: string, projectName: string) => {
    if (!handle || !projectName) {
      set({ error: "Missing project lookup params", isLoading: false });
      return null;
    }
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

    try {
      const response = await fetch(`${apiBase}/accounts/by-handle/${handle}/projects/${projectName}`, { headers });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        set({ error: getErrorMessage(body) ?? `Failed to fetch project (${String(response.status)})`, isLoading: false });
        return null;
      }
      const project = body as Project;
      set((state) => ({
        projectsByKey: { ...state.projectsByKey, [buildProjectKey(handle, projectName)]: project },
        isLoading: false,
        error: null
      }));
      return project;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch project";
      set({ error: message, isLoading: false });
      return null;
    }
  }
}));
