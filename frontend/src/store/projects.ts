import { API_VERSION } from "@underfit/types";
import type { Project } from "@underfit/types";
import { create } from "zustand";

interface ProjectState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: (token?: string) => Promise<void>;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  isLoading: false,
  error: null,
  fetchProjects: async (token?: string) => {
    set({ isLoading: true, error: null });
    const sessionToken = token ?? localStorage.getItem("underfitSessionToken") ?? "";
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

    try {
      const response = await fetch(`${apiBase}/projects/me`, { headers });

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
