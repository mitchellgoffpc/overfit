import { faCheck, faClipboard, faKey } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import TextInputField from "components/fields/TextInputField";
import SectionHeader from "components/SectionHeader";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { dangerButtonClass } from "pages/settings/styles";
import { createApiKey, deleteApiKey, loadApiKeys, useAuthStore } from "stores/auth";
import type { ApiKey } from "types";

const API_KEY_TOKEN_LENGTH = 44;
const API_KEY_CARD_ROW_SPAN = 3.5;
const API_KEY_CARD_GRID_GAP_REM = RULED_LINE_HEIGHT * 0.5;
const API_KEY_CARD_HEIGHT_REM = API_KEY_CARD_ROW_SPAN * RULED_LINE_HEIGHT - API_KEY_CARD_GRID_GAP_REM;

export default function SettingsKeysContent(): ReactElement {
  const status = useAuthStore((state) => state.status);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
  const [apiKeysError, setApiKeysError] = useState<string | null>(null);
  const [isApiKeysLoading, setIsApiKeysLoading] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [createdKeyToken, setCreatedKeyToken] = useState<string | null>(null);
  const [createdKeyCopied, setCreatedKeyCopied] = useState(false);
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
    setCreatedKeyCopied(false);
    const result = await createApiKey(newKeyLabel);
    if (result.ok) {
      setApiKeys((current) => [{
        id: result.body.id,
        userId: result.body.userId,
        label: result.body.label,
        tokenPrefix: result.body.tokenPrefix,
        createdAt: result.body.createdAt
      }, ...current]);
      setCreatedKeyToken(result.body.token);
      setNewKeyLabel("");
      setIsCreatingKey(false);
    } else {
      setApiKeysError(result.error);
      setIsCreatingKey(false);
    }
  };

  const handleCopyCreatedKey = async () => {
    if (!createdKeyToken) { return; }
    try {
      await navigator.clipboard.writeText(createdKeyToken);
      setCreatedKeyCopied(true);
    } catch {
      setApiKeysError("Could not copy API key.");
    }
  };

  useEffect(() => {
    if (!createdKeyCopied) { return; }
    const timeoutId = window.setTimeout(() => { setCreatedKeyCopied(false); }, 2000);
    return () => { window.clearTimeout(timeoutId); };
  }, [createdKeyCopied]);

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

  const formatCreatedAt = (createdAt: string) => new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const maskApiKey = (tokenPrefix: string) => tokenPrefix + "*".repeat(Math.max(0, API_KEY_TOKEN_LENGTH - tokenPrefix.length));
  const sortedApiKeys = [...apiKeys].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <main className="relative pb-[1.5rem] px-4 lg:px-[1.5rem]">
      <SectionHeader title="API Keys" subtitle={`${String(apiKeys.length)} active`} sectionLabel="Section C" />

      {apiKeysError ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: RULED_LINE }}>
          <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">{apiKeysError}</div>
        </div>
      ) : null}

      <div style={{ marginTop: RULED_LINE }}>
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
          <div
            className="grid content-center rounded-xl border border-success-border bg-white p-4"
            style={{
              marginTop: `${String(RULED_LINE_HEIGHT * 0.5)}rem`,
              marginBottom: `${String(RULED_LINE_HEIGHT * 0.5)}rem`,
              height: `${String(RULED_LINE_HEIGHT * 4.0)}rem`
            }}
          >
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-success-text">New secret</p>
            <p className="mt-1 text-sm font-semibold text-brand-text">Copy this key now. It won&apos;t be shown again.</p>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[0.625rem] bg-brand-bg px-3 py-2">
              <div className="overflow-x-auto">
                <code className="font-mono text-xs text-brand-text">{createdKeyToken}</code>
              </div>
              <button
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-[0.5rem] text-brand-textMuted transition hover:text-brand-text`
                  + ` ${createdKeyCopied ? "text-success-text" : ""}`}
                type="button"
                aria-label={createdKeyCopied ? "API key copied" : "Copy API key"}
                title={createdKeyCopied ? "Copied" : "Copy API key"}
                onClick={() => { void handleCopyCreatedKey(); }}
              >
                <FontAwesomeIcon icon={createdKeyCopied ? faCheck : faClipboard} />
              </button>
            </div>
          </div>
        ) : null}

        <p
          className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted"
          style={{ paddingTop: RULED_LINE, lineHeight: RULED_LINE }}
        >
          Active keys
        </p>

        {isApiKeysLoading ? <div className="text-xs text-brand-textMuted">Loading API keys...</div> : null}
        {!isApiKeysLoading && apiKeys.length === 0 ? <div className="text-xs text-brand-textMuted">No API keys yet.</div> : null}

        {apiKeys.length > 0 ? (
          <div className="grid" style={{ gap: `${String(API_KEY_CARD_GRID_GAP_REM)}rem`, marginTop: `${String(RULED_LINE_HEIGHT * 0.25)}rem` }}>
            {sortedApiKeys.map((key) => (
              <section
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-brand-borderMuted bg-white px-4"
                key={key.id}
                style={{ height: `${String(API_KEY_CARD_HEIGHT_REM)}rem` }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={"grid h-10 w-10 shrink-0 place-items-center rounded-[0.875rem] border border-brand-borderMuted"
                      + " bg-brand-bg text-[0.875rem] text-brand-textMuted"}
                  >
                    <FontAwesomeIcon icon={faKey} />
                  </div>
                  <div className="grid min-w-0 gap-1">
                    <p className="truncate text-sm font-semibold text-brand-text">{key.label ?? "Untitled key"}</p>
                    <div className="max-w-full overflow-x-auto">
                      <p className="whitespace-nowrap font-mono text-[0.6875rem] text-brand-textMuted">{maskApiKey(key.tokenPrefix)}</p>
                    </div>
                    <p className="text-[0.6875rem] text-brand-textMuted">Created on {formatCreatedAt(key.createdAt)}</p>
                  </div>
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
              </section>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
