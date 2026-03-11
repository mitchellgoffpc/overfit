import type { Scalar } from "@underfit/types";
import { create } from "zustand";

import { request } from "helpers";
import { useAuthStore } from "store/auth";

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
    const sessionToken = useAuthStore.getState().sessionToken;
    const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

    const { ok, body, error } = await request<Scalar[]>(`accounts/by-handle/${handle}/projects/${projectName}/runs/${runName}/scalars`, { headers });
    if (ok) {
      set({ scalars: body, isLoading: false, error: null });
    } else {
      set({ error, isLoading: false });
    }
  }
}));
