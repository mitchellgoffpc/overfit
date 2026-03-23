import type { Scalar } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";

type ScalarFetchResponse = { ok: true; body: Scalar[]; status: number } | { ok: false; error: string; status: number };

export const fetchRunScalars = async (handle: string, projectName: string, runName: string): Promise<ScalarFetchResponse> =>
  await request<Scalar[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/scalars`);

interface MultiRunScalarsResult { scalarsByRun: Record<string, Scalar[]>; error: string | null }

export const fetchMultiRunScalars = async (handle: string, projectName: string, runNames: string[]): Promise<MultiRunScalarsResult> => {
  const responses = await Promise.all(runNames.map(async (runName) => ({ runName, response: await fetchRunScalars(handle, projectName, runName) })));
  const scalarsByRun: Record<string, Scalar[]> = {};
  const failedRuns: string[] = [];
  for (const { runName, response } of responses) {
    if (response.ok) {
      scalarsByRun[runName] = response.body;
    } else {
      scalarsByRun[runName] = [];
      failedRuns.push(runName);
    }
  }
  return { scalarsByRun, error: failedRuns.length === 0 ? null : `Unable to load scalars for ${failedRuns.join(", ")}.` };
};

interface ScalarState {
  scalars: Scalar[];
  isLoading: boolean;
  error: string | null;
  fetchScalars: (handle: string, projectName: string, runName: string) => Promise<void>;
}

export const useScalarStore = create<ScalarState>((set) => ({
  scalars: [],
  isLoading: false,
  error: null,

  fetchScalars: async (handle: string, projectName: string, runName: string) => {
    set({ isLoading: true, error: null });
    const response = await fetchRunScalars(handle, projectName, runName);
    if (response.ok) {
      set({ scalars: response.body, isLoading: false, error: null });
    } else {
      set({ error: response.error, isLoading: false });
    }
  }
}));
