import { EMAIL_IN_USE_ERROR, USERNAME_IN_USE_ERROR, testEmail, testHandle } from "@underfit/types";
import type { ApiKey, ApiKeyWithToken, User } from "@underfit/types";
import { create } from "zustand";

import { request, send } from "helpers";
import { useUsersStore } from "stores/users";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
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
  status: AuthStatus;
  currentHandle: string | null;
  loadAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (email: string, handle: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  currentHandle: null,

  loadAuth: async () => {
    set({ status: "loading" });
    const { ok, body, status } = await request<User>("me");
    if (ok) {
      useUsersStore.getState().setUser(body);
      set({ status: "authenticated", currentHandle: body.handle });
    } else if (status === 401) {
      set({ status: "unauthenticated", currentHandle: null });
    } else {
      set({ status: "unauthenticated", currentHandle: null });
    }
  },

  login: async (email: string, password: string) => {
    const { ok, error, body } = await send<AuthResponse>("auth/login", "POST", { email, password });
    if (ok) {
      useUsersStore.getState().setUser(body.user);
      set({ status: "authenticated", currentHandle: body.user.handle });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  signup: async (email: string, handle: string, password: string) => {
    const { ok, error, body } = await send<AuthResponse>("auth/register", "POST", { email, handle, password });
    if (ok) {
      useUsersStore.getState().setUser(body.user);
      set({ status: "authenticated", currentHandle: body.user.handle });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  logout: async () => {
    if (get().status === "authenticated") { await request("auth/logout", { method: "POST" }); }
    set({ status: "unauthenticated", currentHandle: null });
  },
}));
