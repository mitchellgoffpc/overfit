import type { User } from "@underfit/types";
import type { ReactElement } from "react";
import { useState } from "react";

import { apiBase } from "helpers";
import { useAuthStore } from "store/auth";

interface ProfileSettingsCardProps {
  readonly user: User;
  readonly onUserUpdated: (user: User) => void;
}

function ProfileSettingsCard({ user, onUserUpdated }: ProfileSettingsCardProps): ReactElement {
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const [name, setName] = useState(() => user.name ?? user.displayName);
  const [bio, setBio] = useState(() => user.bio ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!sessionToken) { return; }
    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);
    try {
      const response = await fetch(`${apiBase}/users/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${sessionToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        const message = body?.error ?? `Save failed (${String(response.status)})`;
        setSaveError(message);
        setIsSaving(false);
        return;
      }
      const updated = (await response.json()) as User;
      onUserUpdated(updated);
      setSaveStatus("Saved");
      setIsSaving(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Save failed";
      setSaveError(message);
      setIsSaving(false);
    }
  };

  return (
    <section className="grid gap-4 rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      {saveError ? <div className="rounded-[10px] border border-[#fecaca] bg-[#fee4e2] px-2.5 py-2 text-xs text-[#b42318]">{saveError}</div> : null}
      {saveStatus ? <div className="rounded-[10px] border border-[#bbf7d0] bg-[#dcfce7] px-2.5 py-2 text-xs text-[#166534]">{saveStatus}</div> : null}
      <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
        Name
        <input
          className="rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
          }}
        />
      </label>
      <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
        Bio
        <textarea
          className="min-h-[96px] resize-none rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          value={bio}
          onChange={(event) => {
            setBio(event.target.value);
          }}
        />
      </label>
      <div className="flex items-center justify-between">
        <p className="text-xs text-brand-textMuted">Changes apply immediately across Underfit.</p>
        <button
          className="rounded-[10px] bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
          type="button"
          onClick={() => {
            void handleSaveProfile();
          }}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </section>
  );
}

export default function SettingsProfileContent(): ReactElement {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  return user ? <ProfileSettingsCard key={user.id} user={user} onUserUpdated={setUser} /> : <div />;
}
