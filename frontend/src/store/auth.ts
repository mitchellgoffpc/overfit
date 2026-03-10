import { EMAIL_IN_USE_ERROR, USERNAME_IN_USE_ERROR, testEmail, testHandle } from "@underfit/types";
import type { User } from "@underfit/types";
import { create } from "zustand";

import { apiBase } from "helpers";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
type AuthResult = { ok: true } | { ok: false; error: string };
type AvailabilityResult = { ok: true; exists: boolean } | { ok: false; error: string };
interface AuthResponse { session: { token: string }; user: User };

const checkAvailability = async (path: string, param: "email" | "handle", value: string): Promise<AvailabilityResult> => {
  try {
    const query = new URLSearchParams({ [param]: value });
    const response = await fetch(`${apiBase}/${path}?${query.toString()}`);
    const body = (await response.json()) as { exists?: boolean };
    if (!response.ok) { return { ok: false, error: `Unable to verify ${param}` }; }
    return { ok: true, exists: Boolean(body.exists) };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unable to verify ${param}`;
    return { ok: false, error: message || `Unable to verify ${param}` };
  }
};

export const checkEmailValid = async (email: string): Promise<string | null> => {
  const trimmed = email.trim();
  if (!trimmed) { return null; }
  const validationError = testEmail(trimmed);
  if (validationError) { return validationError; }
  const result = await checkAvailability("users/email-exists", "email", trimmed);
  return result.ok ? (result.exists ? EMAIL_IN_USE_ERROR : null) : result.error;
};

export const checkHandleValid = async (handle: string): Promise<string | null> => {
  const trimmed = handle.trim();
  if (!trimmed) { return null; }
  const validationError = testHandle(trimmed);
  if (validationError) { return validationError; }
  const result = await checkAvailability("accounts/handle-exists", "handle", trimmed);
  return result.ok ? (result.exists ? USERNAME_IN_USE_ERROR : null) : result.error;
};

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  status: AuthStatus;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (name: string, bio: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, handle: string, password: string) => Promise<AuthResult>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: localStorage.getItem("underfitSessionToken"),
  status: "idle",

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

  login: async (email: string, password: string) => {
    try {
      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const body = (await response.json()) as AuthResponse | { error?: string };
      if (!response.ok) {
        return { ok: false, error: (body as { error?: string }).error ?? `Login failed (${String(response.status)})` };
      } else {
        const { user, session: { token } } = body as AuthResponse;
        localStorage.setItem("underfitSessionToken", token);
        set({ sessionToken: token, user, status: "authenticated" });
        return { ok: true };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      return { ok: false, error: message || "Login failed" };
    }
  },

  signup: async (email: string, handle: string, password: string) => {
    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, handle, password })
      });
      const body = (await response.json()) as AuthResponse | { error?: string };
      if (!response.ok) {
        return { ok: false, error: (body as { error?: string }).error ?? `Sign up failed (${String(response.status)})` };
      } else {
        const { user, session: { token } } = body as AuthResponse;
        localStorage.setItem("underfitSessionToken", token);
        set({ sessionToken: token, user, status: "authenticated" });
        return { ok: true };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign up failed";
      return { ok: false, error: message || "Sign up failed" };
    }
  },

  logout: async () => {
    const { sessionToken } = get();
    if (sessionToken) {
      try {
        await fetch(`${apiBase}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${sessionToken}` } });
      } catch {
        void 0;
      }
    }
    localStorage.removeItem("underfitSessionToken");
    set({ user: null, sessionToken: null, status: "idle" });
  },

  updateUserProfile: async (name: string, bio: string) => {
    const { sessionToken } = get();
    try {
      const response = await fetch(`${apiBase}/users/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${sessionToken ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio })
      });
      const body = (await response.json()) as User | { error?: string };
      if (!response.ok) {
        return { ok: false, error: (body as { error?: string }).error ?? `Save failed (${String(response.status)})` };
      }
      const user = body as User;
      set({ user, status: "authenticated" });
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      return { ok: false, error: message || "Save failed" };
    }
  },
}));
