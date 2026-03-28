import { create } from "zustand";

import { request } from "helpers";
import type { Run } from "types";

export const buildRunKey = (handle: string, projectName: string, runName: string): string => `${handle}/${projectName}/${runName}`;
const getRunsByKey = (runs: Run[]) => Object.fromEntries(runs.map((run) => [buildRunKey(run.projectOwner, run.projectName, run.name), run]));

interface RunState {
  runsByKey: Record<string, Run>;
  isLoading: boolean;
  error: string | null;
  fetchRuns: (handle: string) => Promise<void>;
  fetchProjectRuns: (handle: string, projectName: string) => Promise<void>;
  fetchRun: (handle: string, projectName: string, runName: string) => Promise<Run | null>;
}

export const useRunStore = create<RunState>((set) => ({
  runsByKey: {},
  isLoading: false,
  error: null,

  fetchRuns: async (handle: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Run[]>(`users/${handle}/runs`);
    if (ok) {
      set(({ runsByKey }) => ({ isLoading: false, error: null, runsByKey: { ...runsByKey, ...getRunsByKey(body) } }));
    } else {
      set({ error, isLoading: false });
    }
  },

  fetchProjectRuns: async (handle: string, projectName: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Run[]>(`accounts/${handle}/projects/${projectName}/runs`);
    if (ok) {
      set(({ runsByKey }) => ({ isLoading: false, error: null, runsByKey: { ...runsByKey, ...getRunsByKey(body) } }));
    } else {
      set({ error, isLoading: false });
    }
  },

  fetchRun: async (handle: string, projectName: string, runName: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Run>(`accounts/${handle}/projects/${projectName}/runs/${runName}`);
    if (ok) {
      set(({ runsByKey }) => ({ error: null, isLoading: false, runsByKey: { ...runsByKey, ...getRunsByKey([body]) } }));
      return body;
    } else {
      set({ error, isLoading: false });
      return null;
    }
  }
}));
