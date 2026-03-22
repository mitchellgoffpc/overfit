import type { ApiKey } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import SettingsSidebar from "components/settings/SettingsSidebar";
import { RULED_LINE } from "helpers";
import { dangerButtonClass, inkButtonClass, lineInputClass } from "pages/settings/styles";
import { createApiKey, deleteApiKey, loadApiKeys, useAuthStore } from "stores/auth";

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
    <section className="grid lg:grid-cols-[18.75rem_1fr]">
      <SettingsSidebar sectionLabel="Summary" stats={[{ label: "active keys", value: apiKeys.length }]} />

      <div className="relative p-6">
        <header className="mb-3">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Section C</p>
          <h2 className="mt-1 font-display text-[2.125rem] leading-none text-brand-text">API Keys</h2>
        </header>

        <div className="flex flex-wrap gap-2" style={{ marginBottom: RULED_LINE }}>
          {apiKeysError ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">
            {apiKeysError}
          </div> : null}
        </div>

        <div className="mb-4">
          <p className="mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">New key</p>
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
          <div className="mb-4 rounded-xl border border-brand-borderMuted bg-white p-3">
            <p className="text-xs font-semibold text-brand-text">Copy this key now. You won&apos;t be able to see it again.</p>
            <p className="mt-1 font-mono text-xs text-brand-textMuted">{createdKeyToken}</p>
          </div>
        ) : null}

        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Active keys</p>
          <p className="text-xs text-brand-textMuted">{apiKeys.length} total</p>
        </div>

        {isApiKeysLoading ? <div className="text-xs text-brand-textMuted">Loading API keys...</div> : null}
        {!isApiKeysLoading && apiKeys.length === 0 ? <div className="text-xs text-brand-textMuted">No API keys yet.</div> : null}

        <div className={apiKeys.length > 0 ? "border-t border-brand-borderMuted" : ""}>
          {apiKeys.map((key) => (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-borderMuted px-1 py-3 last:border-b-0" key={key.id}>
              <div className="grid gap-1">
                <p className="text-sm font-semibold">{key.label ?? "Untitled key"}</p>
                <p className="text-[0.6875rem] text-brand-textMuted">
                  Created {new Date(key.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <button
                className={dangerButtonClass}
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
