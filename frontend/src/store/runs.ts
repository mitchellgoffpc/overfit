import type { Run } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";

export const buildRunKey = (handle: string, projectName: string, runName: string): string => `${handle}/${projectName}/${runName}`;

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
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const handle = useAuthStore.getState().user?.handle ?? "workspace";
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;
    const projects = Object.values(useProjectStore.getState().projectsByKey);
    const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

    const { ok, body, error } = await request<Run[]>(`users/${userId}/runs`, { headers });
    if (!ok) {
      set({ error, isLoading: false });
      return;
    }

    set((state) => {
      const next = { ...state.runsByKey };
      body.forEach((run) => {
        const projectName = projectNameById.get(run.projectId);
        if (projectName) {
          next[buildRunKey(handle, projectName, run.name)] = run;
        }
      });
      return { runsByKey: next, isLoading: false, error: null };
    });
  },

  fetchRunByHandle: async (handle: string, projectName: string, runName: string) => {
    set({ isLoading: true, error: null });
    const sessionToken = useAuthStore.getState().sessionToken;
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

    const { ok, body, error } = await request<Run>(`accounts/by-handle/${handle}/projects/${projectName}/runs/${runName}`, { headers });
    if (!ok) {
      set({ error, isLoading: false });
      return null;
    }

    set(({ runsByKey }) => ({ error: null, isLoading: false, runsByKey: { ...runsByKey, [buildRunKey(handle, projectName, runName)]: body } }));
    return body;
  }
}));
