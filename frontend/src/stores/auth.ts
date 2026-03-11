import { EMAIL_IN_USE_ERROR, USERNAME_IN_USE_ERROR, testEmail, testHandle } from "@underfit/types";
import type { User } from "@underfit/types";
import { create } from "zustand";

import { request, post } from "helpers";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
type AuthResult = { ok: true } | { ok: false; error: string };
interface AuthResponse { user: User };

const checkAvailability = async (path: string, param: "email" | "handle", value: string) => {
  const query = new URLSearchParams({ [param]: value });
  return await request<{ exists: boolean }>(`${path}?${query.toString()}`);
};

export const checkEmailValid = async (email: string): Promise<string | null> => {
  const trimmed = email.trim();
  if (!trimmed) { return null; }
  const validationError = testEmail(trimmed);
  if (validationError) { return validationError; }
  const result = await checkAvailability("users/email-exists", "email", trimmed);
  return result.ok ? (result.body.exists ? EMAIL_IN_USE_ERROR : null) : result.error;
};

export const checkHandleValid = async (handle: string): Promise<string | null> => {
  const trimmed = handle.trim();
  if (!trimmed) { return null; }
  const validationError = testHandle(trimmed);
  if (validationError) { return validationError; }
  const result = await checkAvailability("accounts/handle-exists", "handle", trimmed);
  return result.ok ? (result.body.exists ? USERNAME_IN_USE_ERROR : null) : result.error;
};

interface AuthState {
  user: User | null;
  status: AuthStatus;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (name: string, bio: string) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, handle: string, password: string) => Promise<AuthResult>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",

  loadUser: async () => {
    set({ status: "loading" });
    const { ok, body, status: statusCode } = await request<User>("users/me");
    if (ok) {
      set({ user: body, status: "authenticated" });
    } else if (statusCode === 401) {
      set({ user: null, status: "unauthenticated" });
    }
  },

  login: async (email: string, password: string) => {
    const { ok, error, body } = await post<AuthResponse>("auth/login", { email, password });
    if (ok) {
      set({ user: body.user, status: "authenticated" });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  signup: async (email: string, handle: string, password: string) => {
    const { ok, error, body } = await post<AuthResponse>("auth/register", { email, handle, password });
    if (ok) {
      set({ user: body.user, status: "authenticated" });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  logout: async () => {
    if (get().status === "authenticated") { await request("auth/logout", { method: "POST" }); }
    set({ user: null, status: "idle" });
  },

  updateUserProfile: async (name: string, bio: string) => {
    const { ok, error, body } = await request<User>("users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bio })
    });
    if (ok) {
      set({ user: body, status: "authenticated" });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },
}));
