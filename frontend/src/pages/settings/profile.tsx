import type { User } from "@underfit/types";
import type { ChangeEvent, ReactElement } from "react";
import { useMemo, useState } from "react";

import { apiBase } from "helpers";
import { deleteCurrentUserAvatar, uploadCurrentUserAvatar, useAccountsStore } from "stores/accounts";

const uploadButtonClass = "rounded-[10px] bg-brand-accent px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-70";
const smallButtonClass = "rounded-[10px] border border-brand-border bg-white px-3 py-2 text-xs font-semibold"
  + " text-brand-text disabled:cursor-wait disabled:opacity-70";
const avatarClass = "relative grid h-40 w-40 place-items-center overflow-hidden rounded-full border border-brand-border"
  + " bg-[#d9ecec] text-4xl font-semibold text-brand-accentStrong";
const inputClass = "rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none"
  + " focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";
const textareaClass = "min-h-[96px] rounded-[10px] border border-brand-border bg-white px-3 py-2.5"
  + " text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

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
  const avatarSrc = useMemo(() => `${apiBase}/users/${encodeURIComponent(user.handle)}/avatar?v=${avatarVersion.toString()}`, [avatarVersion, user.handle]);

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
    const result = await uploadCurrentUserAvatar(file);
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
    const result = await deleteCurrentUserAvatar();
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
    <section className="grid gap-4 rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      {avatarError ? <div className="rounded-[10px] border border-[#fecaca] bg-[#fee4e2] px-2.5 py-2 text-xs text-[#b42318]">{avatarError}</div> : null}
      {avatarStatus ? <div className="rounded-[10px] border border-[#bbf7d0] bg-[#dcfce7] px-2.5 py-2 text-xs text-[#166534]">{avatarStatus}</div> : null}
      {saveError ? <div className="rounded-[10px] border border-[#fecaca] bg-[#fee4e2] px-2.5 py-2 text-xs text-[#b42318]">{saveError}</div> : null}
      {saveStatus ? <div className="rounded-[10px] border border-[#bbf7d0] bg-[#dcfce7] px-2.5 py-2 text-xs text-[#166534]">{saveStatus}</div> : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_220px] lg:items-start">
        <div className="grid gap-4">
          <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
            Name
            <input
              className={inputClass}
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
              className={textareaClass}
              value={bio}
              onChange={(event) => {
                setBio(event.target.value);
              }}
            />
          </label>
          <div>
            <button
              className="rounded-[10px] bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
              type="button"
              onClick={() => {
                void handleSaveProfile();
              }}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Update profile"}
            </button>
          </div>
        </div>

        <div className="grid justify-items-center gap-3">

          <p className="text-[13px] font-medium text-brand-text">Profile picture</p>
          <div className={avatarClass}>
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
<div className="mt-2 flex gap-2">
            <label className={`${uploadButtonClass} cursor-pointer ${isAvatarSaving ? "cursor-wait opacity-70" : ""}`}>
              {isAvatarSaving ? "Uploading..." : "Upload"}
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
              className={smallButtonClass}
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
    </section>
  );
}

export default function SettingsProfileContent(): ReactElement {
  const user = useAccountsStore((state) => state.me());
  const updateProfile = useAccountsStore((state) => state.updateProfile);

  return user ? <><h1 className="mb-6 text-2xl font-semibold">Profile</h1><ProfileSettingsCard user={user} updateProfile={updateProfile} /></> : <div />;
}
