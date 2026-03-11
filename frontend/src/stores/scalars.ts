import type { Scalar } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";

interface ScalarState {
  scalars: Scalar[];
  isLoading: boolean;
  error: string | null;
  fetchScalarsByHandle: (handle: string, projectName: string, runName: string) => Promise<void>;
}

export const useScalarStore = create<ScalarState>((set) => ({
  scalars: [],
  isLoading: false,
  error: null,

  fetchScalarsByHandle: async (handle: string, projectName: string, runName: string) => {
    set({ isLoading: true, error: null });
    const { ok, body, error } = await request<Scalar[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/scalars`);
    if (ok) {
      set({ scalars: body, isLoading: false, error: null });
    } else {
      set({ error, isLoading: false });
    }
  }
}));
