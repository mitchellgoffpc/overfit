import { create } from "zustand";

import type { ActionResult } from "helpers";
import { EMAIL_IN_USE_ERROR, USERNAME_IN_USE_ERROR, request, send, testEmail, testHandle } from "helpers";
import { useAccountsStore } from "stores/accounts";
import type { ApiKey, ApiKeyWithToken, User } from "types";

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
interface AuthResponse { user: User };

interface AuthState {
  status: AuthStatus;
  currentHandle: string | null;
}

export const useAuthStore = create<AuthState>(() => ({
  status: "idle",
  currentHandle: null
}));

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

export const loadApiKeys = async (): Promise<ActionResult<ApiKey[]>> => {
  const { ok, error, body } = await request<ApiKey[]>("me/api-keys");
  return ok ? { ok: true, body } : { ok: false, error };
};

export const createApiKey = async (label: string): Promise<ActionResult<ApiKeyWithToken>> => {
  const { ok, error, body } = await send<ApiKeyWithToken>("me/api-keys", "POST", { label });
  return ok ? { ok: true, body } : { ok: false, error };
};

export const deleteApiKey = async (id: string): Promise<ActionResult> => {
  const { ok, error } = await request<{ status: "ok" }>(`me/api-keys/${id}`, { method: "DELETE" });
  return ok ? { ok: true } : { ok: false, error };
};

export const requestPasswordReset = async (email: string): Promise<ActionResult> => {
  const { ok, error } = await send<{ status: "ok" }>("auth/forgot-password", "POST", { email });
  return ok ? { ok: true } : { ok: false, error };
};

export const completePasswordReset = async (token: string, password: string): Promise<ActionResult> => {
  const { ok, error } = await send<{ status: "ok" }>("auth/reset-password", "POST", { token, password });
  return ok ? { ok: true } : { ok: false, error };
};

const setAuthenticated = (user: User): void => {
  useAccountsStore.setState((state) => ({ accounts: { ...state.accounts, [user.handle]: user } }));
  useAuthStore.setState({ status: "authenticated", currentHandle: user.handle });
};

export const loadAuth = async (): Promise<void> => {
  useAuthStore.setState({ status: "loading" });
  const { ok, body } = await request<User>("me");
  if (ok) { setAuthenticated(body); }
  else { useAuthStore.setState({ status: "unauthenticated", currentHandle: null }); }
};

export const login = async (email: string, password: string): Promise<ActionResult> => {
  const { ok, error, body } = await send<AuthResponse>("auth/login", "POST", { email, password });
  if (!ok) { return { ok: false, error }; }
  setAuthenticated(body.user);
  return { ok: true };
};

export const signup = async (email: string, handle: string, password: string): Promise<ActionResult> => {
  const { ok, error, body } = await send<AuthResponse>("auth/register", "POST", { email, handle, password });
  if (!ok) { return { ok: false, error }; }
  setAuthenticated(body.user);
  return { ok: true };
};

export const logout = async (): Promise<void> => {
  if (useAuthStore.getState().status === "authenticated") { await request("auth/logout", { method: "POST" }); }
  useAuthStore.setState({ status: "unauthenticated", currentHandle: null });
};
