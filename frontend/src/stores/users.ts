import type { User } from "@underfit/types";
import { create } from "zustand";

import { request, send } from "helpers";

type UserStatus = "idle" | "loading" | "authenticated" | "unauthenticated";
type UserResult = { ok: true } | { ok: false; error: string };

export const uploadCurrentUserAvatar = async (file: File): Promise<UserResult> => {
  const body = await file.arrayBuffer();
  const { ok, error } = await request<{ status: "ok" }>("me/avatar", {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body
  });
  return ok ? { ok: true } : { ok: false, error };
};

export const deleteCurrentUserAvatar = async (): Promise<UserResult> => {
  const { ok, error } = await request<{ status: "ok" }>("me/avatar", { method: "DELETE" });
  return ok ? { ok: true } : { ok: false, error };
};

interface UsersState {
  user: User | null;
  status: UserStatus;
  loadUser: () => Promise<void>;
  updateUser: (name: string, bio: string) => Promise<UserResult>;
  setAuthenticatedUser: (user: User) => void;
  clearUser: (status?: UserStatus) => void;
}

export const useUsersStore = create<UsersState>((set) => ({
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

  updateUser: async (name: string, bio: string) => {
    const { ok, error, body } = await send<User>("me", "PATCH", { name, bio });
    if (ok) {
      set({ user: body, status: "authenticated" });
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  setAuthenticatedUser: (user: User) => {
    set({ user, status: "authenticated" });
  },

  clearUser: (status = "idle") => {
    set({ user: null, status });
  },
}));
