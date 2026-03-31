import { create } from "zustand";

import type { ActionResult } from "helpers";
import { request, send } from "helpers";
import { useAuthStore } from "stores/auth";
import type { Organization, User } from "types";

export const uploadCurrentAccountAvatar = async (file: File): Promise<ActionResult> => {
  const body = await file.arrayBuffer();
  const { ok, error } = await request<{ status: "ok" }>("me/avatar", {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body
  });
  return ok ? { ok: true } : { ok: false, error };
};

export const deleteCurrentAccountAvatar = async (): Promise<ActionResult> => {
  const { ok, error } = await request<{ status: "ok" }>("me/avatar", { method: "DELETE" });
  return ok ? { ok: true } : { ok: false, error };
};

interface AccountsState {
  accounts: Record<string, User | Organization>;
  notFoundHandles: Set<string>;
  me: () => User | null;
  fetchAccount: (handle: string) => Promise<User | Organization | null>;
  updateProfile: (name: string, bio: string) => Promise<ActionResult>;
  setAccount: (account: User | Organization) => void;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: {},
  notFoundHandles: new Set(),

  me: () => {
    const currentHandle = useAuthStore.getState().currentHandle;
    const account = currentHandle ? get().accounts[currentHandle] ?? null : null;
    return account?.type === "USER" ? account : null;
  },

  fetchAccount: async (handle: string) => {
    const { ok, body } = await request<User | Organization>(`accounts/${handle}`);
    if (ok) {
      set((state) => ({ accounts: { ...state.accounts, [body.handle]: body } }));
      return body;
    } else {
      set((state) => ({ notFoundHandles: new Set(state.notFoundHandles).add(handle) }));
      return null;
    }
  },

  updateProfile: async (name: string, bio: string) => {
    const { ok, error, body } = await send<User>("me", "PATCH", { name, bio });
    if (ok) {
      set((state) => ({ accounts: { ...state.accounts, [body.handle]: body } }));
      return { ok: true };
    } else {
      return { ok: false, error };
    }
  },

  setAccount: (account: User | Organization) => {
    set((state) => ({ accounts: { ...state.accounts, [account.handle]: account } }));
  },
}));
