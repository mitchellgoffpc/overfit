import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import TextInputField from "components/fields/TextInputField";
import SectionHeader from "components/SectionHeader";
import { RULED_LINE } from "helpers";
import { dangerButtonClass } from "pages/settings/styles";
import { createApiKey, deleteApiKey, loadApiKeys, useAuthStore } from "stores/auth";
import type { ApiKey } from "types";

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
    <main className="relative pb-[1.5rem] px-4 lg:px-[1.5rem]">
      <SectionHeader title="API Keys" subtitle={`${String(apiKeys.length)} active`} sectionLabel="Section C" />

      {apiKeysError ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: RULED_LINE }}>
          <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">{apiKeysError}</div>
        </div>
      ) : null}

      <div className="grid gap-4" style={{ marginTop: RULED_LINE }}>
        <TextInputField
          label="New key"
          type="text"
          placeholder="Local training rig"
          value={newKeyLabel}
          hint="Use labels that identify where the key is used."
          onChange={(event) => { setNewKeyLabel(event.target.value); }}
          submitLabel="Add key"
          submittingLabel="Creating..."
          onSubmit={() => { void handleCreateKey(); }}
          isSubmitting={isCreatingKey}
          submitDisabled={!newKeyLabel.trim()}
        />

        {createdKeyToken ? (
          <div className="rounded-xl border border-success-border bg-white p-4">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-success-text">New secret</p>
            <p className="mt-1 text-sm font-semibold text-brand-text">Copy this key now. It won&apos;t be shown again.</p>
            <div className="mt-3 overflow-x-auto rounded-[0.625rem] bg-brand-bg px-3 py-2">
              <code className="font-mono text-xs text-brand-text">{createdKeyToken}</code>
            </div>
          </div>
        ) : null}

        <section className="rounded-xl border border-brand-borderMuted bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-brand-borderMuted px-4 py-3">
            <div>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Active keys</p>
              <p className="text-xs text-brand-textMuted">Manage tokens used by your local tools and services.</p>
            </div>
            <p className="rounded-full border border-brand-borderMuted bg-brand-bg px-2.5 py-1 text-[0.6875rem] text-brand-textMuted">
              {apiKeys.length} total
            </p>
          </div>

          {isApiKeysLoading ? <div className="px-4 py-4 text-xs text-brand-textMuted">Loading API keys...</div> : null}
          {!isApiKeysLoading && apiKeys.length === 0 ? <div className="px-4 py-4 text-xs text-brand-textMuted">No API keys yet.</div> : null}

          {apiKeys.length > 0 ? (
            <div className="grid gap-3 p-3">
              {apiKeys.map((key) => (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[0.875rem] bg-brand-bg px-4 py-3" key={key.id}>
                  <div className="grid gap-1">
                    <p className="text-sm font-semibold text-brand-text">{key.label ?? "Untitled key"}</p>
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
          ) : null}
        </section>
      </div>
    </main>
  );
}
