import type { Run } from "@underfit/types";
import { create } from "zustand";

import { apiBase } from "helpers";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";

export const buildRunKey = (handle: string, projectName: string, runName: string): string => `${handle}/${projectName}/${runName}`;
const getErrorMessage = (body: unknown): string | null => {
  if (!body || typeof body !== "object") { return null; }
  if (!("error" in body)) { return null; }
  const errorValue = body.error;
  return typeof errorValue === "string" ? errorValue : null;
};

interface RunState {
  runsByKey: Record<string, Run>;
  isLoading: boolean;
  error: string | null;
  fetchRuns: (userId: string) => Promise<void>;
  fetchRunByHandle: (handle: string, projectName: string, runName: string) => Promise<Run | null>;
}

export const useRunStore = create<RunState>((set) => ({
  runsByKey: {},
  isLoading: false,
  error: null,
  fetchRuns: async (userId: string) => {
    if (!userId) {
      set({ isLoading: false, error: "Missing user id" });
      return;
    }
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const handle = useAuthStore.getState().user?.handle ?? "workspace";
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;
    const projects = Object.values(useProjectStore.getState().projectsByKey);
    const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

    try {
      const response = await fetch(`${apiBase}/users/${userId}/runs`, { headers });

      if (!response.ok) {
        set({ error: `Failed to fetch runs (${String(response.status)})`, isLoading: false });
        return;
      }

      const runs = (await response.json()) as Run[];
      set((state) => {
        const next = { ...state.runsByKey };
        runs.forEach((run) => {
          const projectName = projectNameById.get(run.projectId);
          if (projectName) {
            next[buildRunKey(handle, projectName, run.name)] = run;
          }
        });
        return { runsByKey: next, isLoading: false, error: null };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch runs";
      set({ error: message, isLoading: false });
    }
  },
  fetchRunByHandle: async (handle: string, projectName: string, runName: string) => {
    if (!handle || !projectName || !runName) {
      set({ error: "Missing run lookup params", isLoading: false });
      return null;
    }
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

    try {
      const response = await fetch(`${apiBase}/accounts/by-handle/${handle}/projects/${projectName}/runs/${runName}`, { headers });
      const body = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        set({ error: getErrorMessage(body) ?? `Failed to fetch run (${String(response.status)})`, isLoading: false });
        return null;
      }
      const run = body as Run;
      set((state) => ({
        runsByKey: { ...state.runsByKey, [buildRunKey(handle, projectName, runName)]: run },
        isLoading: false,
        error: null
      }));
      return run;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch run";
      set({ error: message, isLoading: false });
      return null;
    }
  }
}));
