import type { Scalar } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";

type ScalarFetchResponse = { ok: true; body: Scalar[]; status: number } | { ok: false; error: string; status: number };

export const fetchRunScalars = async (handle: string, projectName: string, runName: string): Promise<ScalarFetchResponse> =>
  await request<Scalar[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/scalars`);

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
