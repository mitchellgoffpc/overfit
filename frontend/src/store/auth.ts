import { API_VERSION } from "@underfit/types";
import type { User } from "@underfit/types";
import { create } from "zustand";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  authFailed: boolean;
  loadUser: (token?: string) => Promise<void>;
  clearAuth: () => void;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,
  authFailed: false,
  loadUser: async (token?: string) => {
    const sessionToken = token ?? localStorage.getItem("underfitSessionToken") ?? "";
    if (!sessionToken) {
      set({ user: null, isLoading: false, error: null, authFailed: true });
      return;
    }

    set({ isLoading: true, error: null, authFailed: false });
    try {
      const response = await fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${sessionToken}` } });
      if (!response.ok) {
        set({ user: null, isLoading: false, error: `Failed to load user (${String(response.status)})`, authFailed: true });
        return;
      }
      const user = (await response.json()) as User;
      set({ user, isLoading: false, error: null, authFailed: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load user";
      set({ user: null, isLoading: false, error: message, authFailed: true });
    }
  },
  clearAuth: () => {
    set({ user: null, isLoading: false, error: null, authFailed: false });
  }
}));
