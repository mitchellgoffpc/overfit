import type { User } from "@underfit/types";
import type { ChangeEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import { apiBase } from "helpers";
import { deleteCurrentAccountAvatar, uploadCurrentAccountAvatar, useAccountsStore } from "stores/accounts";

const inkButtonClass = "rounded-[10px] border border-[#1f3637] bg-[#1f3637] px-4 py-2 text-sm font-semibold text-white"
  + " transition hover:bg-[#152a2b] disabled:cursor-wait disabled:opacity-70";
const paperButtonClass = "rounded-[10px] border border-[#cfd8d8] bg-white px-3 py-2 text-xs font-semibold"
  + " text-brand-text transition hover:bg-[#f5f9f9] disabled:cursor-wait disabled:opacity-70";
const lineInputClass = "w-full rounded-[10px] border border-[#d2dddd] bg-white/70 px-3 py-2.5 text-sm"
  + " outline-none transition focus:border-brand-accent";
const notesTextareaClass = "min-h-[96px] w-full rounded-[10px] border border-[#d2dddd] bg-white/70 px-3 py-2.5"
  + " text-sm outline-none transition focus:border-brand-accent";
const avatarFrameClass = "relative grid h-40 w-40 place-items-center overflow-hidden rounded-full border border-[#bfd0d0]"
  + " bg-[#dceaea] text-4xl font-semibold text-brand-accentStrong";

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
  const initials = useMemo(() => user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [user.name]);
  const avatarSrc = useMemo(() => `${apiBase}/accounts/${encodeURIComponent(user.handle)}/avatar?v=${avatarVersion.toString()}`, [avatarVersion, user.handle]);
  const notebookDate = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    []
  );

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
    <section className="grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-[#d2dfdf] px-5 py-5 lg:border-b-0 lg:border-r lg:border-[#d2dfdf] lg:pl-14 lg:pr-5 lg:pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
        <h2 className="mt-1 font-display text-[34px] leading-none text-brand-text">Settings</h2>
        <p className="mt-2 font-mono text-[11px] text-brand-textMuted" style={{ lineHeight: "30px" }}>{notebookDate}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] mt-[28px] text-brand-textMuted" style={{ lineHeight: "30px" }}>Subject</p>
        <div className="flex items-center justify-between text-[12px]" style={{ height: "30px" }}>
          <span className="text-brand-textMuted">handle</span>
          <span className="font-semibold text-brand-text">@{user.handle}</span>
        </div>
        <div className="flex items-center justify-between text-[12px]" style={{ height: "30px" }}>
          <span className="text-brand-textMuted">role</span>
          <span className="font-semibold text-brand-text">Researcher</span>
        </div>
      </aside>

      <div className="relative p-6">
        <header className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Section A</p>
          <h2 className="mt-1 font-display text-[34px] leading-none text-brand-text">Profile</h2>
        </header>

        <div className="flex flex-wrap gap-2 mb-[30px]">
          {saveError ? <div className="rounded-[10px] border border-[#f7c1c1] bg-[#fff0ef] px-3 py-1.5 text-xs text-[#8f2d2d]">{saveError}</div> : null}
          {saveStatus ? <div className="rounded-[10px] border border-[#bde4c7] bg-[#e9f8ee] px-3 py-1.5 text-xs text-[#1e6a3a]">{saveStatus}</div> : null}
          {avatarError ? <div className="rounded-[10px] border border-[#f7c1c1] bg-[#fff0ef] px-3 py-1.5 text-xs text-[#8f2d2d]">{avatarError}</div> : null}
          {avatarStatus ? <div className="rounded-[10px] border border-[#bde4c7] bg-[#e9f8ee] px-3 py-1.5 text-xs text-[#1e6a3a]">{avatarStatus}</div> : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm text-brand-text">
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">Name</span>
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
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">Bio</span>
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
              <p className="font-mono text-[11px] text-brand-textMuted">field: profile/settings</p>
            </div>
          </div>

          <div className="grid content-start justify-items-center gap-3">
            <div className="w-full max-w-[210px] rounded-[12px] border border-[#d3dddd] bg-white p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-brand-textMuted">Portrait</p>
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
              <p className="mt-2 text-center font-mono text-[11px] text-brand-textMuted">@{user.handle}</p>
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
