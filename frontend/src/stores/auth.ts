import { EMAIL_IN_USE_ERROR, USERNAME_IN_USE_ERROR, testEmail, testHandle } from "@underfit/types";
import type { ApiKey, ApiKeyWithToken, User } from "@underfit/types";
import { create } from "zustand";

import { request, send } from "helpers";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
type AuthResult = { ok: true } | { ok: false; error: string };
type ApiKeysResult = { ok: true; body: ApiKey[] } | { ok: false; error: string };
type CreateApiKeyResult = { ok: true; body: ApiKeyWithToken } | { ok: false; error: string };
interface AuthResponse { user: User };

export const checkEmailValid = async (email: string): Promise<string | null> => {
  const trimmed = email.trim();
  if (!trimmed) { return null; }
  const validationError = testEmail(trimmed);
  if (validationError) { return validationError; }
  const query = new URLSearchParams({ email: trimmed });
  const result = await request<{ exists: boolean }>(`emails/exists?${query.toString()}`);
  return result.ok ? (result.body.exists ? EMAIL_IN_USE_ERROR : null) : result.error;
};

export const checkHandleValid = async (handle: string): Promise<string | null> => {
  const trimmed = handle.trim();
  if (!trimmed) { return null; }
  const validationError = testHandle(trimmed);
  if (validationError) { return validationError; }
  const result = await request<{ exists: boolean }>(`accounts/${encodeURIComponent(trimmed)}/exists`);
  return result.ok ? (result.body.exists ? USERNAME_IN_USE_ERROR : null) : result.error;
};

export const loadApiKeys = async (): Promise<ApiKeysResult> => {
  const { ok, error, body } = await request<ApiKey[]>("me/api-keys");
  return ok ? { ok: true, body } : { ok: false, error };
};

export const createApiKey = async (label: string): Promise<CreateApiKeyResult> => {
  const { ok, error, body } = await send<ApiKeyWithToken>("me/api-keys", "POST", { label });
  return ok ? { ok: true, body } : { ok: false, error };
};

export const deleteApiKey = async (id: string): Promise<AuthResult> => {
  const { ok, error } = await request<{ status: "ok" }>(`me/api-keys/${id}`, { method: "DELETE" });
  return ok ? { ok: true } : { ok: false, error };
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
    const { ok, body, status: statusCode } = await request<User>("me");
    if (ok) {
      set({ user: body, status: "authenticated" });
    } else if (statusCode === 401) {
      set({ user: null, status: "unauthenticated" });
    }
  },

  login: async (email: string, password: string) => {
    const { ok, error, body } = await send<AuthResponse>("auth/login", "POST", { email, password });
    if (ok) {
      set({ user: body.user, status: "authenticated" });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  signup: async (email: string, handle: string, password: string) => {
    const { ok, error, body } = await send<AuthResponse>("auth/register", "POST", { email, handle, password });
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
    const { ok, error, body } = await send<User>("me", "PATCH", { name, bio });
    if (ok) {
      set({ user: body, status: "authenticated" });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },
}));
