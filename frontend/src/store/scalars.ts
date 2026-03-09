import { API_VERSION } from "@underfit/types";
import type { Scalar } from "@underfit/types";
import { create } from "zustand";

import { useAuthStore } from "store/auth";

interface ScalarState {
  scalars: Scalar[];
  isLoading: boolean;
  error: string | null;
  fetchScalars: (runId: string) => Promise<void>;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export const useScalarStore = create<ScalarState>((set) => ({
  scalars: [],
  isLoading: false,
  error: null,
  fetchScalars: async (runId: string) => {
    if (!runId) {
      set({ scalars: [], isLoading: false, error: "Missing run id" });
    } else {
      set({ isLoading: true, error: null });
      const sessionToken = useAuthStore.getState().sessionToken;
      const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

      try {
        const response = await fetch(`${apiBase}/runs/${runId}/scalars`, { headers });

        if (!response.ok) {
          set({ error: `Failed to fetch scalars (${String(response.status)})`, isLoading: false });
          return;
        }

        const scalars = (await response.json()) as Scalar[];
        set({ scalars, isLoading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch scalars";
        set({ error: message, isLoading: false });
      }
    }
  }
}));
