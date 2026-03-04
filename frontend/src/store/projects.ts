import { API_VERSION } from "@overfit/types";
import type { Project } from "@overfit/types";
import { create } from "zustand";

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  isLoading: false,
  error: null,
  fetchProjects: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch(`${apiBase}/projects`);

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
