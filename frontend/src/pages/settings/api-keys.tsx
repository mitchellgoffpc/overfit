import type { ApiKey } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

import { createApiKey, deleteApiKey, loadApiKeys, useAuthStore } from "stores/auth";

const inkButtonClass = "rounded-[10px] border border-[#1f3637] bg-[#1f3637] px-4 py-2 text-sm font-semibold text-white"
  + " transition hover:bg-[#152a2b] disabled:cursor-wait disabled:opacity-70";
const lineInputClass = "w-full rounded-[10px] border border-[#d2dddd] bg-white/70 px-3 py-2.5 text-sm"
  + " outline-none transition focus:border-brand-accent";
const deleteButtonClass = "rounded-[10px] border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs font-semibold"
  + " text-[#b42318] hover:border-[#f87171] hover:bg-[#fee2e2] disabled:cursor-wait disabled:opacity-70";

export default function SettingsKeysContent(): ReactElement {
  const status = useAuthStore((state) => state.status);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [isApiKeysLoading, setIsApiKeysLoading] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [createdKeyToken, setCreatedKeyToken] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isDeletingKey, setIsDeletingKey] = useState<string | null>(null);
  const notebookDate = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    []
  );

  useEffect(() => {
    if (apiKeysLoaded || status !== "authenticated") { return; }
    const loadKeys = async () => {
      setIsApiKeysLoading(true);
      setApiKeysError(null);
      const result = await loadApiKeys();
      if (result.ok) {
        setApiKeys(result.body);
        setApiKeysLoaded(true);
        setIsApiKeysLoading(false);
      } else {
        setApiKeysError(result.error);
        setIsApiKeysLoading(false);
      }
    };

    void loadKeys();
  }, [apiKeysLoaded, status]);

  const handleCreateKey = async () => {
    if (status !== "authenticated") { return; }
    if (!newKeyLabel.trim()) {
      setApiKeysError("Label is required.");
      return;
    }
    setIsCreatingKey(true);
    setApiKeysError(null);
    setCreatedKeyToken(null);
    const result = await createApiKey(newKeyLabel);
    if (result.ok) {
      setApiKeys((current) => [{ id: result.body.id, userId: result.body.userId, label: result.body.label, createdAt: result.body.createdAt }, ...current]);
      setCreatedKeyToken(result.body.token);
      setNewKeyLabel("");
      setIsCreatingKey(false);
    } else {
      setApiKeysError(result.error);
      setIsCreatingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (status !== "authenticated") { return; }
    setIsDeletingKey(id);
    setApiKeysError(null);
    const result = await deleteApiKey(id);
    if (result.ok) {
      setApiKeys((current) => current.filter((key) => key.id !== id));
      setIsDeletingKey(null);
    } else {
      setApiKeysError(result.error);
      setIsDeletingKey(null);
    }
  };

  return (
    <section className="grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-[#d2dfdf] px-5 py-5 lg:border-b-0 lg:border-r lg:border-[#d2dfdf] lg:pl-14 lg:pr-5 lg:pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
        <h2 className="mt-1 font-display text-[34px] leading-none text-brand-text">Settings</h2>
        <p className="mt-2 font-mono text-[11px] text-brand-textMuted" style={{ lineHeight: "30px" }}>{notebookDate}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] mt-[28px] text-brand-textMuted" style={{ lineHeight: "30px" }}>Summary</p>
        <div className="flex items-center justify-between text-[12px]" style={{ height: "30px" }}>
          <span className="text-brand-textMuted">active keys</span>
          <span className="font-semibold text-brand-text">{apiKeys.length}</span>
        </div>
      </aside>

      <div className="relative p-6">
        <header className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Section C</p>
          <h2 className="mt-1 font-display text-[34px] leading-none text-brand-text">API Keys</h2>
        </header>

        <div className="flex flex-wrap gap-2 mb-[30px]">
          {apiKeysError ? <div className="rounded-[10px] border border-[#f7c1c1] bg-[#fff0ef] px-3 py-1.5 text-xs text-[#8f2d2d]">{apiKeysError}</div> : null}
        </div>

        <div className="mb-4">
          <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">New key</p>
          <div className="flex gap-2">
            <input
              className={lineInputClass + " flex-1"}
              type="text"
              placeholder="Local training rig"
              value={newKeyLabel}
              onChange={(event) => { setNewKeyLabel(event.target.value); }}
            />
            <button
              className={inkButtonClass}
              type="button"
              onClick={() => { void handleCreateKey(); }}
              disabled={isCreatingKey}
            >
              {isCreatingKey ? "Creating..." : "Add key"}
            </button>
          </div>
        </div>

        {createdKeyToken ? (
          <div className="mb-4 rounded-[12px] border border-[#d3dddd] bg-white p-3">
            <p className="text-xs font-semibold text-brand-text">Copy this key now. You won&apos;t be able to see it again.</p>
            <p className="mt-1 font-mono text-xs text-brand-textMuted">{createdKeyToken}</p>
          </div>
        ) : null}

        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">Active keys</p>
          <p className="text-xs text-brand-textMuted">{apiKeys.length} total</p>
        </div>

        {isApiKeysLoading ? <div className="text-xs text-brand-textMuted">Loading API keys...</div> : null}
        {!isApiKeysLoading && apiKeys.length === 0 ? <div className="text-xs text-brand-textMuted">No API keys yet.</div> : null}

        <div className={apiKeys.length > 0 ? "border-t border-[#d2dfdf]" : ""}>
          {apiKeys.map((key) => (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d2dfdf] px-1 py-3 last:border-b-0" key={key.id}>
              <div className="grid gap-1">
                <p className="text-sm font-semibold">{key.label ?? "Untitled key"}</p>
                <p className="text-[11px] text-brand-textMuted">
                  Created {new Date(key.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                className={deleteButtonClass}
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
