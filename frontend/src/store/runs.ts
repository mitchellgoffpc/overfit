import { API_VERSION } from "@underfit/types";
import type { Run } from "@underfit/types";
import { create } from "zustand";

interface RunState {
  runs: Run[];
  isLoading: boolean;
  error: string | null;
  fetchRuns: (userId: string, token?: string) => Promise<void>;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export const useRunStore = create<RunState>((set) => ({
  runs: [],
  isLoading: false,
  error: null,
  fetchRuns: async (userId: string, token?: string) => {
    if (!userId) {
      set({ runs: [], isLoading: false, error: "Missing user id" });
    } else {
      set({ isLoading: true, error: null });
      const sessionToken = token ?? localStorage.getItem("underfitSessionToken") ?? "";
      const headers = sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined;

      try {
        const response = await fetch(`${apiBase}/users/${userId}/runs`, { headers });

        if (!response.ok) {
          set({ error: `Failed to fetch runs (${String(response.status)})`, isLoading: false });
          return;
        }

        const runs = (await response.json()) as Run[];
        set({ runs, isLoading: false, error: null });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to fetch runs";
        set({ error: message, isLoading: false });
      }
    }
  }
}));
