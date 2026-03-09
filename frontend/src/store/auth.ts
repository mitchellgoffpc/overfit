import { API_VERSION } from "@underfit/types";
import type { User } from "@underfit/types";
import { create } from "zustand";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  status: AuthStatus;
  setSessionToken: (token: string) => void;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: localStorage.getItem("underfitSessionToken"),
  status: "idle",
  setSessionToken: (token: string) => {
    localStorage.setItem("underfitSessionToken", token);
    set({ sessionToken: token });
  },
  loadUser: async () => {
    const { sessionToken } = get();
    if (!sessionToken) {
      set({ user: null, status: "unauthenticated" });
      return;
    }

    set({ status: "loading" });
    try {
      const response = await fetch(`${apiBase}/users/me`, { headers: { Authorization: `Bearer ${sessionToken}` } });
      if (!response.ok) {
        set({ user: null, status: "unauthenticated" });
      } else {
        const user = (await response.json()) as User;
        set({ user, status: "authenticated" });
      }
    } catch {
      set({ user: null, status: "unauthenticated" });
    }
  },
  setUser: (user: User | null) => {
    set({ user, status: user ? "authenticated" : "unauthenticated" });
  },
  clearAuth: () => {
    localStorage.removeItem("underfitSessionToken");
    set({ user: null, sessionToken: null, status: "idle" });
  }
}));
