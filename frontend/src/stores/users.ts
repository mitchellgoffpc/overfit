import type { User } from "@underfit/types";
import { create } from "zustand";

import { request, send } from "helpers";
import { useAuthStore } from "stores/auth";

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
  users: Record<string, User>;
  me: () => User | null;
  updateUser: (name: string, bio: string) => Promise<UserResult>;
  setUser: (user: User) => void;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  users: {},

  updateUser: async (name: string, bio: string) => {
    if (!useAuthStore.getState().currentHandle) { return { ok: false, error: "Not authenticated." }; }
    const { ok, error, body } = await send<User>("me", "PATCH", { name, bio });
    if (ok) {
      set((state) => ({ users: { ...state.users, [body.handle]: body } }));
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  setUser: (user: User) => {
    set((state) => ({ users: { ...state.users, [user.handle]: user } }));
  },

  me: () => {
    const currentHandle = useAuthStore.getState().currentHandle;
    return currentHandle ? get().users[currentHandle] ?? null : null;
  },
}));
