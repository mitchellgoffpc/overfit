import type { User } from "@underfit/types";
import type { ReactElement } from "react";
import { useState } from "react";

import { useAuthStore } from "stores/auth";

interface ProfileSettingsCardProps {
  readonly user: User;
  readonly updateUserProfile: (name: string, bio: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function ProfileSettingsCard({ user, updateUserProfile }: ProfileSettingsCardProps): ReactElement {
  const [name, setName] = useState(() => user.name ?? user.displayName);
  const [bio, setBio] = useState(() => user.bio ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);
    const result = await updateUserProfile(name, bio);
    if (result.ok) {
      setSaveStatus("Saved");
      setIsSaving(false);
    } else {
      setSaveError(result.error);
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
  const updateUserProfile = useAuthStore((state) => state.updateUserProfile);

  return user ? <ProfileSettingsCard key={user.id} user={user} updateUserProfile={updateUserProfile} /> : <div />;
}
