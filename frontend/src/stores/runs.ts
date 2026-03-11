import type { Run } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";
import { useProjectStore } from "stores/projects";

export const buildRunKey = (handle: string, projectName: string, runName: string): string => `${handle}/${projectName}/${runName}`;

interface RunState {
  runsByKey: Record<string, Run>;
  isLoading: boolean;
  error: string | null;
  fetchRuns: (handle: string) => Promise<void>;
  fetchRun: (handle: string, projectName: string, runName: string) => Promise<Run | null>;
}

export const useRunStore = create<RunState>((set) => ({
  runsByKey: {},
  isLoading: false,
  error: null,

  fetchRuns: async (handle: string) => {
    set({ isLoading: true, error: null });
    const projects = Object.values(useProjectStore.getState().projectsByKey);
    const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

    const { ok, body, error } = await request<Run[]>(`users/${handle}/runs`);
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

  fetchRun: async (handle: string, projectName: string, runName: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Run>(`accounts/${handle}/projects/${projectName}/runs/${runName}`);
    if (ok) {
      set(({ runsByKey }) => ({ error: null, isLoading: false, runsByKey: { ...runsByKey, [buildRunKey(handle, projectName, runName)]: body } }));
      return body;
    } else {
      set({ error, isLoading: false });
      return null;
    }
  }
}));
