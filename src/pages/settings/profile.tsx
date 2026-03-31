import type { ChangeEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import SettingsSidebar from "components/settings/SettingsSidebar";
import { getInitials, RULED_LINE } from "helpers";
import { inkButtonClass, lineInputClass, paperButtonClass } from "pages/settings/styles";
import { deleteCurrentAccountAvatar, uploadCurrentAccountAvatar, useAccountsStore } from "stores/accounts";
import { API_BASE } from "types";
import type { User } from "types";

const notesTextareaClass = "min-h-24 w-full rounded-[0.625rem] border border-brand-borderMuted bg-white/70 px-3 py-2.5"
  + " text-sm outline-none transition focus:border-brand-accent";
const avatarFrameClass = "relative grid h-40 w-40 place-items-center overflow-hidden rounded-full border border-brand-borderStrong"
  + " bg-brand-accentMuted text-4xl font-semibold text-brand-accentStrong";

interface ProfileSettingsCardProps {
  readonly user: User;
  readonly updateProfile: (name: string, bio: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function ProfileSettingsCard({ user, updateProfile }: ProfileSettingsCardProps): ReactElement {
  const [name, setName] = useState(() => user.name);
  const [bio, setBio] = useState(() => user.bio ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<string | null>(null);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(() => Date.now());
  const [isAvatarMissing, setIsAvatarMissing] = useState(false);
  const initials = useMemo(() => getInitials(user.name), [user.name]);
  const avatarSrc = useMemo(() => `${API_BASE}/accounts/${encodeURIComponent(user.handle)}/avatar?v=${avatarVersion.toString()}`, [avatarVersion, user.handle]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);
    const result = await updateProfile(name, bio);
    if (result.ok) {
      setSaveStatus("Saved");
      setIsSaving(false);
    } else {
      setSaveError(result.error);
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) { return; }

    setIsAvatarSaving(true);
    setAvatarError(null);
    setAvatarStatus(null);
    const result = await uploadCurrentAccountAvatar(file);
    if (result.ok) {
      setAvatarStatus("Profile picture updated");
      setIsAvatarMissing(false);
      setAvatarVersion(Date.now());
      setIsAvatarSaving(false);
    } else {
      setAvatarError(result.error);
      setIsAvatarSaving(false);
    }
  };

  const handleAvatarDelete = async () => {
    setIsAvatarSaving(true);
    setAvatarError(null);
    setAvatarStatus(null);
    const result = await deleteCurrentAccountAvatar();
    if (result.ok) {
      setAvatarStatus("Profile picture removed");
      setIsAvatarMissing(true);
      setAvatarVersion(Date.now());
      setIsAvatarSaving(false);
    } else {
      setAvatarError(result.error);
      setIsAvatarSaving(false);
    }
  };

  return (
    <section className="grid lg:grid-cols-[18.75rem_1fr]">
      <SettingsSidebar
        sectionLabel="Subject"
        stats={[{ label: "handle", value: `@${user.handle}` }, { label: "role", value: "Researcher" }]}
      />

      <div className="relative pb-6 px-4 pt-6 lg:p-6">
        <header className="mb-3">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Section A</p>
          <h2 className="mt-1 font-display text-[2.125rem] leading-none text-brand-text">Profile</h2>
        </header>

        <div className="flex flex-wrap gap-2" style={{ marginBottom: RULED_LINE }}>
          {saveError ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">
            {saveError}
          </div> : null}
          {saveStatus ? <div className="rounded-[0.625rem] border border-success-border bg-success-bg px-3 py-1.5 text-xs text-success-text">
            {saveStatus}
          </div> : null}
          {avatarError ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">
            {avatarError}
          </div> : null}
          {avatarStatus ? <div className="rounded-[0.625rem] border border-success-border bg-success-bg px-3 py-1.5 text-xs text-success-text">
            {avatarStatus}
          </div> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_15rem]">
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm text-brand-text">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Name</span>
              <input
                className={lineInputClass}
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            </label>

            <label className="grid gap-1 text-sm text-brand-text">
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Bio</span>
              <textarea
                className={notesTextareaClass}
                value={bio}
                placeholder="What are you currently building or exploring?"
                onChange={(event) => {
                  setBio(event.target.value);
                }}
              />
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                className={inkButtonClass}
                type="button"
                onClick={() => {
                  void handleSaveProfile();
                }}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Update profile"}
              </button>
              <p className="font-mono text-[0.6875rem] text-brand-textMuted">field: profile/settings</p>
            </div>
          </div>

          <div className="grid content-start justify-items-center gap-3">
            <div className="w-full max-w-[13.125rem] rounded-xl border border-brand-borderMuted bg-white p-3">
              <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">Portrait</p>
              <div className={avatarFrameClass}>
                {!isAvatarMissing ? (
                  <img
                    className="h-full w-full object-cover"
                    src={avatarSrc}
                    alt={`${user.name} avatar`}
                    onLoad={() => {
                      setIsAvatarMissing(false);
                    }}
                    onError={() => {
                      setIsAvatarMissing(true);
                    }}
                  />
                ) : initials}
              </div>
              <p className="mt-2 text-center font-mono text-[0.6875rem] text-brand-textMuted">@{user.handle}</p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <label className={`${paperButtonClass} cursor-pointer ${isAvatarSaving ? "cursor-wait opacity-70" : ""}`}>
                {isAvatarSaving ? "Uploading..." : "Attach"}
                <input
                  className="hidden"
                  type="file"
                  accept="image/*"
                  disabled={isAvatarSaving}
                  onChange={(event) => {
                    void handleAvatarUpload(event);
                  }}
                />
              </label>
              <button
                className={paperButtonClass}
                type="button"
                onClick={() => {
                  void handleAvatarDelete();
                }}
                disabled={isAvatarSaving}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SettingsProfileContent(): ReactElement {
  const user = useAccountsStore((state) => state.me());
  const updateProfile = useAccountsStore((state) => state.updateProfile);

  return user ? <ProfileSettingsCard user={user} updateProfile={updateProfile} /> : <div />;
}
