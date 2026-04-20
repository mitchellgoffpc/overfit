import { faCheck, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ChangeEvent, ReactElement } from "react";
import { useEffect, useState } from "react";

import Avatar from "components/Avatar";
import TextAreaField from "components/fields/TextAreaField";
import TextInputField from "components/fields/TextInputField";
import SectionHeader from "components/SectionHeader";
import { RULED_LINE } from "helpers";
import { accentButtonClass } from "pages/settings/styles";
import { deleteAvatar, getMe, updateMe, updateAvatar, useAccountsStore } from "stores/accounts";

export default function SettingsProfileContent(): ReactElement {
  const user = useAccountsStore(getMe);
  const [name, setName] = useState(() => user?.name ?? "");
  const [bio, setBio] = useState(() => user?.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSavedState, setShowSavedState] = useState(false);
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [hasAvatarImage, setHasAvatarImage] = useState(false);

  useEffect(() => {
    if (!showSavedState) { return; }
    const timeoutId = window.setTimeout(() => { setShowSavedState(false); }, 2000);
    return () => { window.clearTimeout(timeoutId); };
  }, [showSavedState]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);
    const result = await updateMe(name, bio);
    if (result.ok) { setShowSavedState(true); }
    else { setSaveError(result.error); }
    setIsSaving(false);
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) { return; }

    setIsAvatarSaving(true);
    setAvatarError(null);
    const result = await updateAvatar(file);
    if (!result.ok) { setAvatarError(result.error); }
    setIsAvatarSaving(false);
  };

  const handleAvatarDelete = async () => {
    setIsAvatarSaving(true);
    setAvatarError(null);
    const result = await deleteAvatar();
    if (!result.ok) { setAvatarError(result.error); }
    setIsAvatarSaving(false);
  };

  const saveButtonContent = isSaving ? "Saving..." : showSavedState ? (
    <span className="inline-flex items-center gap-1.5 leading-none">
      <span className="grid h-3 w-3 place-items-center">
        <FontAwesomeIcon icon={faCheck} className="text-[0.625rem]" />
      </span>
      <span>Saved</span>
    </span>
  ) : "Update profile";

  if (!user) { return <div />; }

  return (
    <main className="relative pb-[1.5rem] px-4 lg:px-[1.5rem]">
      <SectionHeader title="Profile" sectionLabel="Section A" />

      {saveError || avatarError ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: RULED_LINE }}>
          {saveError ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">
            {saveError}
          </div> : null}
          {avatarError ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">
            {avatarError}
          </div> : null}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-[1fr_15rem] xs:grid-cols-[1fr_10rem] gap-3" style={{ marginTop: RULED_LINE }}>
        <div>
          <TextInputField
            label="Name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setShowSavedState(false);
            }}
          />

          <TextAreaField
            label="Bio"
            value={bio}
            placeholder="What are you currently building or exploring?"
            onChange={(event) => {
              setBio(event.target.value);
              setShowSavedState(false);
            }}
          />

        </div>

        <div className="grid content-start justify-items-start gap-3 xs:justify-items-center">
          <div className="grid w-full justify-items-start xs:w-auto xs:justify-items-center">
            <p
              className="mt-[1.875rem] mb-1 self-start font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted xs:mt-0"
              style={{ lineHeight: RULED_LINE }}
            >
              Avatar
            </p>
            <div className="relative">
              <Avatar
                handle={user.handle}
                name={user.name}
                className="h-28 w-28 border border-brand-borderStrong text-3xl xs:h-36 xs:w-36 xs:text-4xl"
                onHasImageChange={setHasAvatarImage}
              />
              <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center gap-2">
                <label
                  className={"grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-brand-borderMuted"
                    + ` bg-white text-[0.875rem] text-brand-text shadow-soft transition`
                    + ` hover:bg-hover-subtle ${isAvatarSaving ? "cursor-wait opacity-70" : ""}`}
                  title={isAvatarSaving ? "Uploading..." : "Edit avatar"}
                >
                  <FontAwesomeIcon icon={faPen} />
                  <span className="sr-only">{isAvatarSaving ? "Uploading avatar" : "Edit avatar"}</span>
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    disabled={isAvatarSaving}
                    onChange={(event) => { void handleAvatarUpload(event); }}
                  />
                </label>
                {hasAvatarImage ? (
                  <button
                    className={"grid h-9 w-9 place-items-center rounded-full border border-danger-border bg-danger-bg"
                      + " text-[0.875rem] text-danger-text shadow-soft transition hover:bg-danger-bgHover"
                      + " disabled:cursor-not-allowed disabled:opacity-70"}
                    type="button"
                    title="Delete avatar"
                    onClick={() => { void handleAvatarDelete(); }}
                    disabled={isAvatarSaving}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    <span className="sr-only">Delete avatar</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-2 pt-1">
        <button
          className={accentButtonClass}
          type="button"
          onClick={() => { void handleSaveProfile(); }}
          disabled={isSaving}
        >
          {saveButtonContent}
        </button>
      </div>
    </main>
  );
}
