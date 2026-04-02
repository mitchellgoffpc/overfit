import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";

import Avatar from "components/Avatar";
import TextAreaField from "components/fields/TextAreaField";
import TextInputField from "components/fields/TextInputField";
import SectionHeader from "components/SectionHeader";
import { RULED_LINE } from "helpers";
import { inkButtonClass, paperButtonClass } from "pages/settings/styles";
import { deleteAvatar, getMe, updateMe, updateAvatar, useAccountsStore } from "stores/accounts";

export default function SettingsProfileContent(): ReactElement {
  const user = useAccountsStore(getMe);
  const [name, setName] = useState(() => user?.name ?? "");
  const [bio, setBio] = useState(() => user?.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean, message: string } | null>(null);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [avatarResult, setAvatarResult] = useState<{ ok: boolean, message: string } | null>(null);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveResult(null);
    const result = await updateMe(name, bio);
    setSaveResult(result.ok ? { ok: true, message: "Saved" } : { ok: false, message: result.error });
    setIsSaving(false);
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) { return; }

    setIsAvatarSaving(true);
    setAvatarResult(null);
    const result = await updateAvatar(file);
    setAvatarResult(result.ok ? { ok: true, message: "Profile picture updated" } : { ok: false, message: result.error });
    setIsAvatarSaving(false);
  };

  const handleAvatarDelete = async () => {
    setIsAvatarSaving(true);
    setAvatarResult(null);
    const result = await deleteAvatar();
    setAvatarResult(result.ok ? { ok: true, message: "Profile picture removed" } : { ok: false, message: result.error });
    setIsAvatarSaving(false);
  };

  if (!user) { return <div />; }

  return (
    <main className="relative pb-[1.5rem] px-4 lg:px-[1.5rem]">
      <SectionHeader title="Profile" subtitle={`@${user.handle}`} sectionLabel="Section A" />

      {saveResult || avatarResult ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: RULED_LINE }}>
          {saveResult ? <div className={`rounded-[0.625rem] border px-3 py-1.5 text-xs ${saveResult.ok
            ? "border-success-border bg-success-bg text-success-text" : "border-danger-border bg-danger-bg text-danger-text"}`}>
            {saveResult.message}
          </div> : null}
          {avatarResult ? <div className={`rounded-[0.625rem] border px-3 py-1.5 text-xs ${avatarResult.ok
            ? "border-success-border bg-success-bg text-success-text" : "border-danger-border bg-danger-bg text-danger-text"}`}>
            {avatarResult.message}
          </div> : null}
        </div>
      ) : null}

      <div className="grid lg:grid-cols-[1fr_15rem] lg:gap-x-6" style={{ marginTop: RULED_LINE }}>
        <div>
          <TextInputField
            label="Name"
            type="text"
            value={name}
            onChange={(event) => { setName(event.target.value); }}
          />

          <TextAreaField
            label="Bio"
            value={bio}
            placeholder="What are you currently building or exploring?"
            onChange={(event) => { setBio(event.target.value); }}
          />

          <div className="mt-8 flex flex-wrap items-center gap-2 pt-1">
            <button
              className={inkButtonClass}
              type="button"
              onClick={() => { void handleSaveProfile(); }}
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
            <Avatar
              handle={user.handle}
              name={user.name}
              className="h-40 w-40 border border-brand-borderStrong text-4xl"
            />
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
                onChange={(event) => { void handleAvatarUpload(event); }}
              />
            </label>
            <button
              className={paperButtonClass}
              type="button"
              onClick={() => { void handleAvatarDelete(); }}
              disabled={isAvatarSaving}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
