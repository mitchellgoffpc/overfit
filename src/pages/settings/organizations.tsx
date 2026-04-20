import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useShallow } from "zustand/react/shallow";

import Avatar from "components/Avatar";
import Modal from "components/Modal";
import SectionHeader from "components/SectionHeader";
import { RULED_LINE, RULED_LINE_HEIGHT, USERNAME_HINT } from "helpers";
import { accentButtonClass, dangerButtonClass, inkButtonClass, lineInputClass, paperButtonClass } from "pages/settings/styles";
import type { OrganizationMembership } from "stores/accounts";
import { createOrganization, fetchUserMemberships, getUserMemberships, leaveOrganization, useAccountsStore } from "stores/accounts";
import { checkHandleValid, useAuthStore } from "stores/auth";

const ORGANIZATION_CARD_ROW_SPAN = 3;
const ORGANIZATION_CARD_GRID_GAP_REM = RULED_LINE_HEIGHT * 0.35;
const ORGANIZATION_CARD_HEIGHT_REM = ORGANIZATION_CARD_ROW_SPAN * RULED_LINE_HEIGHT - ORGANIZATION_CARD_GRID_GAP_REM;

export default function SettingsOrganizationsContent(): ReactElement {
  const [, navigate] = useLocation();
  const status = useAuthStore((state) => state.status);
  const currentHandle = useAuthStore((state) => state.currentHandle);
  const memberships = useAccountsStore((state) => currentHandle ? state.membershipsByUser[currentHandle] : undefined);
  const membershipList = useAccountsStore(useShallow(getUserMemberships(currentHandle ?? "")));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newName, setNewName] = useState("");
  const [newHandleHintError, setNewHandleHintError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLeaving, setIsLeaving] = useState<string | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<OrganizationMembership | null>(null);

  useEffect(() => {
    if (memberships !== undefined || status !== "authenticated") { return; }
    const load = async () => {
      setIsLoading(true);
      const result = await fetchUserMemberships();
      if (!result.ok) { setError(result.error); }
      setIsLoading(false);
    };
    void load();
  }, [memberships, status]);

  const handleCreate = async () => {
    if (!newHandle.trim() || !newName.trim()) {
      setCreateError("Handle and name are required.");
      return;
    }
    const nextHandleError = await checkHandleValid(newHandle);
    setNewHandleHintError(nextHandleError);
    if (nextHandleError) { return; }
    setIsCreating(true);
    setCreateError(null);
    const result = await createOrganization(newHandle, newName);
    if (result.ok) {
      navigate(`/${result.body.handle}`);
    } else {
      setCreateError(result.error);
    }
    setIsCreating(false);
  };

  const openCreateModal = () => {
    setNewHandle("");
    setNewName("");
    setNewHandleHintError(null);
    setCreateError(null);
    setShowCreate(true);
  };

  const handleNewHandleBlur = async () => {
    setNewHandleHintError(await checkHandleValid(newHandle));
  };

  const handleLeave = async (orgHandle: string) => {
    setIsLeaving(orgHandle);
    setError(null);
    const result = await leaveOrganization(orgHandle);
    if (!result.ok) { setError(result.error); }
    setIsLeaving(null);
  };

  return (
    <main className="relative pb-[1.5rem] px-4 lg:px-[1.5rem]">
      <SectionHeader title="Organizations" subtitle={`${String(membershipList.length)} memberships`} sectionLabel="Section B" />

      {error ? (
        <div className="flex flex-wrap gap-2" style={{ marginTop: RULED_LINE }}>
          <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">{error}</div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3" style={{ marginTop: RULED_LINE, minHeight: RULED_LINE }}>
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>
          Your organizations
        </p>
        <button
          className={`${accentButtonClass} inline-flex items-center px-3 text-xs`}
          type="button"
          onClick={openCreateModal}
          style={{
            height: `${String(RULED_LINE_HEIGHT * 1.25)}rem`,
            marginTop: `${String(-RULED_LINE_HEIGHT * 0.125)}rem`,
            marginBottom: `${String(-RULED_LINE_HEIGHT * 0.125)}rem`
          }}
        >
          <span>Create organization</span>
        </button>
      </div>

      {isLoading ? <div className="text-xs text-brand-textMuted">Loading organizations...</div> : null}
      {!isLoading && membershipList.length === 0 ? <div className="text-xs text-brand-textMuted">You are not a member of any organizations.</div> : null}

      <div
        className="grid"
        style={membershipList.length > 0
          ? { gap: `${String(ORGANIZATION_CARD_GRID_GAP_REM)}rem`, marginTop: `${String(RULED_LINE_HEIGHT * 0.65)}rem` }
          : undefined}
      >
        {membershipList.map((membership) => (
          <section
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-brand-borderMuted bg-white px-4"
            key={membership.handle}
            style={{ height: `${String(ORGANIZATION_CARD_HEIGHT_REM)}rem` }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar handle={membership.handle} name={membership.name} className="h-8 w-8 shrink-0 text-[0.625rem]" />
              <div className="grid min-w-0 gap-[0.125rem]">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link
                    className={"inline-flex max-w-full min-w-0 self-start text-sm font-semibold text-brand-accentStrong"
                      + " underline-offset-2 transition hover:underline"}
                    href={`/${membership.handle}`}
                  >
                    <span className="block truncate">{membership.name}</span>
                  </Link>
                  <span className="rounded-full border border-brand-borderMuted px-2 py-0.5 text-[0.625rem] font-medium text-brand-textMuted">
                    {membership.role}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-brand-textMuted">
                  <span>@{membership.handle}</span>
                </div>
              </div>
            </div>
            <button
              className={dangerButtonClass}
              type="button"
              onClick={() => { setLeaveTarget(membership); }}
              disabled={isLeaving === membership.handle}
            >
              {isLeaving === membership.handle ? "Leaving..." : "Leave"}
            </button>
          </section>
        ))}
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); }}>
        <div className="grid gap-3.5">
          <div className="grid place-items-center gap-2.5 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-[0.875rem] bg-brand-text text-[1.375rem] text-white">
              <span className="font-display">U</span>
            </div>
            <div>
              <p className="text-xl font-semibold">Create organization</p>
              <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Create a shared workspace for your team.</p>
            </div>
          </div>
          {createError ? (
            <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-2.5 py-2 text-xs text-danger-text">{createError}</div>
          ) : null}
          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Handle
            <input
              className={`${lineInputClass} ${newHandleHintError ? "border-danger-text focus:border-danger-text" : ""}`.trim()}
              type="text"
              placeholder="acme"
              value={newHandle}
              onChange={(e) => {
                setNewHandle(e.target.value);
                setNewHandleHintError(null);
              }}
              onBlur={() => {
                void handleNewHandleBlur();
              }}
            />
            <span className={newHandleHintError ? "text-xs font-medium text-danger-text" : "text-xs font-normal text-brand-textMuted"}>
              {newHandleHintError ?? USERNAME_HINT}
            </span>
          </label>
          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Display name
            <input className={lineInputClass} type="text" placeholder="Acme Corp" value={newName} onChange={(e) => { setNewName(e.target.value); }} />
          </label>
          <button
            className={inkButtonClass}
            type="button"
            onClick={() => { void handleCreate(); }}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create organization"}
          </button>
        </div>
      </Modal>

      <Modal open={leaveTarget !== null} onClose={() => { setLeaveTarget(null); }}>
        <div className="grid gap-4">
          <p className="text-sm font-semibold">Leave {leaveTarget?.name}?</p>
          <p className="text-xs text-brand-textMuted">
            Once you leave this organization, you won&apos;t be able to rejoin unless you are invited by an existing member.
          </p>
          <div className="flex justify-end gap-2">
            <button
              className={paperButtonClass}
              type="button"
              onClick={() => { setLeaveTarget(null); }}
            >
              Cancel
            </button>
            <button
              className={dangerButtonClass}
              type="button"
              disabled={isLeaving !== null}
              onClick={() => {
                if (!leaveTarget) { return; }
                const handle = leaveTarget.handle;
                setLeaveTarget(null);
                void handleLeave(handle);
              }}
            >
              {isLeaving !== null ? "Leaving..." : "Leave organization"}
            </button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
