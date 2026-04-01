import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import Avatar from "components/Avatar";
import Modal from "components/Modal";
import SectionHeader from "components/SectionHeader";
import { RULED_LINE } from "helpers";
import { dangerButtonClass, inkButtonClass, lineInputClass, paperButtonClass } from "pages/settings/styles";
import { addCollaborator, buildProjectKey, removeCollaborator, useProjectStore } from "stores/projects";
import type { Project, User } from "types";

function UserPlusIcon({ className }: { readonly className?: string }): ReactElement {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

interface CollaboratorsSettingsProps {
  readonly project: Project;
}

const EMPTY_COLLABORATORS: User[] = [];

export default function CollaboratorsSettings({ project }: CollaboratorsSettingsProps): ReactElement {
  const projectKey = buildProjectKey(project.owner, project.name);
  const collaborators = useProjectStore((s) => s.collaboratorsByKey[projectKey] ?? EMPTY_COLLABORATORS);
  const fetchCollaborators = useProjectStore((s) => s.fetchCollaborators);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [removingHandle, setRemovingHandle] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<User | null>(null);

  useEffect(() => {
    void fetchCollaborators(project.owner, project.name);
  }, [fetchCollaborators, project.owner, project.name]);

  const handleAdd = async () => {
    const handle = newHandle.trim();
    if (!handle) { setAddError("Username is required."); return; }
    setIsAdding(true);
    setAddError(null);
    const result = await addCollaborator(project.owner, project.name, handle);
    if (result.ok) { setNewHandle(""); setShowAdd(false); }
    else { setAddError(result.error); }
    setIsAdding(false);
  };

  const handleRemove = async (userHandle: string) => {
    setRemovingHandle(userHandle);
    setError(null);
    const result = await removeCollaborator(project.owner, project.name, userHandle);
    if (!result.ok) { setError(result.error); }
    setRemovingHandle(null);
  };

  const openAddModal = () => { setNewHandle(""); setAddError(null); setShowAdd(true); };

  return (
    <div>
      <SectionHeader title="Collaborators" subtitle={`${String(collaborators.length)} people`} sectionLabel="Section B" />

      {error ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: RULED_LINE }}>
          <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">
            {error}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between" style={{ marginTop: RULED_LINE }}>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Manage access</p>
        <button className={inkButtonClass} type="button" onClick={openAddModal}>Add people</button>
      </div>

      {collaborators.length === 0 ? (
        <div className="mt-4 grid place-items-center gap-3 rounded-[0.625rem] border border-brand-borderMuted bg-white/90 py-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-brand-accentMuted text-xl text-brand-accentStrong">
            <UserPlusIcon className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-text">No collaborators yet</p>
            <p className="mt-1 text-[0.6875rem] text-brand-textMuted">
              Add people to give them access to this project.
            </p>
          </div>
          <button className={paperButtonClass} type="button" onClick={openAddModal}>Add people</button>
        </div>
      ) : null}

      {collaborators.length > 0 ? (
        <div className="mt-3 border-t border-brand-borderMuted">
          {collaborators.map((user) => (
            <div key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-borderMuted px-1 py-3 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Avatar handle={user.handle} name={user.name} className="h-8 w-8 text-xs" />
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-[0.6875rem] text-brand-textMuted">@{user.handle}</p>
                </div>
              </div>
              <button
                className={dangerButtonClass}
                type="button"
                onClick={() => { setRemoveTarget(user); }}
                disabled={removingHandle === user.handle}
              >
                {removingHandle === user.handle ? "Removing..." : "Remove"}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); }}>
        <div className="grid gap-3.5">
          <div className="grid place-items-center gap-2.5 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-[0.875rem] bg-brand-text text-[1.375rem] text-white">
              <UserPlusIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-semibold">Add collaborator</p>
              <p className="mt-1 text-[0.8125rem] text-brand-textMuted">
                Search by username to add them to this project.
              </p>
            </div>
          </div>
          {addError ? (
            <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-2.5 py-2 text-xs text-danger-text">
              {addError}
            </div>
          ) : null}
          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Username
            <input
              className={lineInputClass}
              type="text"
              placeholder="Enter a username"
              value={newHandle}
              onChange={(e) => { setNewHandle(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") { void handleAdd(); } }}
            />
          </label>
          <div className="flex justify-end gap-2">
            <button className={paperButtonClass} type="button" onClick={() => { setShowAdd(false); }}>
              Cancel
            </button>
            <button className={inkButtonClass} type="button" onClick={() => { void handleAdd(); }} disabled={isAdding}>
              {isAdding ? "Adding..." : "Add to project"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={removeTarget !== null} onClose={() => { setRemoveTarget(null); }}>
        <div className="grid gap-4">
          <p className="text-sm font-semibold">Remove {removeTarget?.name}?</p>
          <p className="text-xs text-brand-textMuted">
            This will revoke their access to this project. You can add them back later.
          </p>
          <div className="flex justify-end gap-2">
            <button className={paperButtonClass} type="button" onClick={() => { setRemoveTarget(null); }}>
              Cancel
            </button>
            <button
              className={dangerButtonClass}
              type="button"
              disabled={removingHandle !== null}
              onClick={() => {
                if (!removeTarget) { return; }
                const handle = removeTarget.handle;
                setRemoveTarget(null);
                void handleRemove(handle);
              }}
            >
              {removingHandle !== null ? "Removing..." : "Remove collaborator"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
