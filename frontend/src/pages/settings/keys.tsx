import type { ApiKey } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import { request } from "helpers";
import { useAuthStore } from "stores/auth";

export default function SettingsKeysContent(): ReactElement {
  const status = useAuthStore((state) => state.status);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [isApiKeysLoading, setIsApiKeysLoading] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState<string | null>(null);

  useEffect(() => {
    if (apiKeysLoaded || status !== "authenticated") { return; }
    const loadApiKeys = async () => {
      setIsApiKeysLoading(true);
      setApiKeysError(null);
      try {
        const result = await request<ApiKey[]>("users/me/api-keys");
        if (!result.ok) {
          setApiKeysError(result.error);
          setIsApiKeysLoading(false);
          return;
        }
        setApiKeys(result.body);
        setApiKeysLoaded(true);
        setIsApiKeysLoading(false);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load API keys";
        setApiKeysError(message);
        setIsApiKeysLoading(false);
      }
    };

    void loadApiKeys();
  }, [apiKeysLoaded, status]);

  const handleCreateKey = async () => {
    if (status !== "authenticated") { return; }
    setIsCreatingKey(true);
    setApiKeysError(null);
    try {
      const result = await request<ApiKey>("users/me/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newKeyLabel })
      });
      if (!result.ok) {
        setApiKeysError(result.error);
        setIsCreatingKey(false);
        return;
      }
      setApiKeys((current) => [result.body, ...current]);
      setNewKeyLabel("");
      setIsCreatingKey(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create API key";
      setApiKeysError(message);
      setIsCreatingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (status !== "authenticated") { return; }
    setIsDeletingKey(id);
    setApiKeysError(null);
    try {
      const result = await request<{ status: "ok" }>(`users/me/api-keys/${id}`, { method: "DELETE" });
      if (!result.ok) {
        setApiKeysError(result.error);
        setIsDeletingKey(null);
        return;
      }
      setApiKeys((current) => current.filter((key) => key.id !== id));
      setIsDeletingKey(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete API key";
      setApiKeysError(message);
      setIsDeletingKey(null);
    }
  };

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
        <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
          New key label
          <input
            className="rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
            type="text"
            placeholder="Local training rig"
            value={newKeyLabel}
            onChange={(event) => {
              setNewKeyLabel(event.target.value);
            }}
          />
        </label>
        <div className="flex items-center justify-between">
          <p className="text-xs text-brand-textMuted">Create a new API key for scripts or automation.</p>
          <button
            className="rounded-[10px] bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
            type="button"
            onClick={() => {
              void handleCreateKey();
            }}
            disabled={isCreatingKey}
          >
            {isCreatingKey ? "Creating..." : "Add key"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Active keys</p>
          <p className="text-xs text-brand-textMuted">{apiKeys.length} total</p>
        </div>
        {apiKeysError ? <div className="text-xs text-[#b42318]">{apiKeysError}</div> : null}
        {isApiKeysLoading ? <div className="text-xs text-brand-textMuted">Loading API keys...</div> : null}
        {!isApiKeysLoading && apiKeys.length === 0 ? <div className="text-xs text-brand-textMuted">No API keys yet.</div> : null}
        <div className="grid gap-2">
          {apiKeys.map((key) => (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-brand-border bg-white px-4 py-3" key={key.id}>
              <div className="grid gap-1">
                <p className="text-sm font-semibold">{key.label ?? "Untitled key"}</p>
                <p className="font-mono text-xs text-brand-textMuted">{key.token}</p>
                <p className="text-[11px] text-brand-textMuted">Created {new Date(key.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
              <button
                className="rounded-[10px] border border-brand-border px-3 py-2 text-xs font-semibold text-brand-text hover:border-brand-accent"
                type="button"
                onClick={() => {
                  void handleDeleteKey(key.id);
                }}
                disabled={isDeletingKey === key.id}
              >
                {isDeletingKey === key.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
