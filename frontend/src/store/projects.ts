import type { Project } from "@underfit/types";
import { create } from "zustand";

import { apiBase } from "helpers";
import { useAuthStore } from "store/auth";

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  isLoading: false,
  error: null,
  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;
    const endpoint = sessionToken ? "projects/me" : "projects";

    try {
      const response = await fetch(`${apiBase}/${endpoint}`, { headers });

      if (!response.ok) {
        set({ error: `Failed to fetch projects (${String(response.status)})`, isLoading: false });
        return;
      }

      const projects = (await response.json()) as Project[];
      set({ projects, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch projects";
      set({ error: message, isLoading: false });
    }
  }
}));
