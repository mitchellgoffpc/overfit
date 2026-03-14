import type { User } from "@underfit/types";
import type { ChangeEvent, ReactElement } from "react";
import { useMemo, useRef, useState } from "react";

import { apiBase } from "helpers";
import { deleteCurrentUserAvatar, uploadCurrentUserAvatar, useAuthStore } from "stores/auth";

interface ProfileSettingsCardProps {
  readonly user: User;
  readonly updateUser: (name: string, bio: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

function ProfileSettingsCard({ user, updateUser }: ProfileSettingsCardProps): ReactElement {
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initials = useMemo(() => user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [user.name]);
  const avatarSrc = useMemo(() => `${apiBase}/users/${encodeURIComponent(user.handle)}/avatar?v=${avatarVersion.toString()}`, [avatarVersion, user.handle]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveStatus(null);
    const result = await updateUser(name, bio);
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
      <div className="flex items-center justify-between rounded-[12px] border border-brand-border bg-white px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#d9ecec] text-sm font-semibold text-brand-accentStrong">
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
          <div>
            <p className="text-sm font-semibold text-brand-text">Profile picture</p>
            <p className="text-xs text-brand-textMuted">Upload a square image for best results.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => { void handleAvatarUpload(event); }} />
          <button
            className="rounded-[10px] border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-text disabled:cursor-wait disabled:opacity-70"
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            disabled={isAvatarSaving}
          >
            {isAvatarSaving ? "Uploading..." : "Upload"}
          </button>
          <button
            className="rounded-[10px] border border-brand-border bg-white px-3 py-2 text-xs font-semibold text-brand-text disabled:cursor-wait disabled:opacity-70"
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
  const updateUser = useAuthStore((state) => state.updateUser);

  return user ? <ProfileSettingsCard key={user.id} user={user} updateUser={updateUser} /> : <div />;
}
