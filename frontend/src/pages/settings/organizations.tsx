import type { Organization, OrganizationRole } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import Modal from "components/Modal";
import SettingsSidebar from "components/settings/SettingsSidebar";
import { RULED_LINE } from "helpers";
import { dangerButtonClass, inkButtonClass, lineInputClass, paperButtonClass } from "pages/settings/styles";
import { useAuthStore } from "stores/auth";
import { createOrganization, fetchMyMemberships, leaveOrganization } from "stores/organizations";

type Membership = Organization & { role: OrganizationRole };

export default function SettingsOrganizationsContent(): ReactElement {
  const status = useAuthStore((state) => state.status);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLeaving, setIsLeaving] = useState<string | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<Membership | null>(null);

  useEffect(() => {
    if (loaded || status !== "authenticated") { return; }
    const load = async () => {
      setIsLoading(true);
      setError(null);
      const result = await fetchMyMemberships();
      if (result.ok) {
        setMemberships(result.body);
        setLoaded(true);
      } else {
        setError(result.error);
      }
      setIsLoading(false);
    };
    void load();
  }, [loaded, status]);

  const handleCreate = async () => {
    if (!newHandle.trim() || !newName.trim()) {
      setCreateError("Handle and name are required.");
      return;
    }
    setIsCreating(true);
    setCreateError(null);
    const result = await createOrganization(newHandle, newName);
    if (result.ok) {
      setMemberships((current) => [...current, { ...result.body, role: "ADMIN" }]);
      setNewHandle("");
      setNewName("");
      setShowCreate(false);
    } else {
      setCreateError(result.error);
    }
    setIsCreating(false);
  };

  const openCreateModal = () => {
    setNewHandle("");
    setNewName("");
    setCreateError(null);
    setShowCreate(true);
  };

  const handleLeave = async (orgHandle: string) => {
    setIsLeaving(orgHandle);
    setError(null);
    const result = await leaveOrganization(orgHandle);
    if (result.ok) {
      setMemberships((current) => current.filter((m) => m.handle !== orgHandle));
    } else {
      setError(result.error);
    }
    setIsLeaving(null);
  };

  return (
    <section className="grid lg:grid-cols-[18.75rem_1fr]">
      <SettingsSidebar sectionLabel="Summary" stats={[{ label: "memberships", value: memberships.length }]} />

      <div className="relative p-6">
        <header className="mb-3">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Section B</p>
          <h2 className="mt-1 font-display text-[2.125rem] leading-none text-brand-text">Organizations</h2>
        </header>

        <div className="flex flex-wrap gap-2" style={{ marginBottom: RULED_LINE }}>
          {error ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">{error}</div> : null}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Your organizations</p>
          <button className={inkButtonClass} type="button" onClick={openCreateModal}>New organization</button>
        </div>

        {isLoading ? <div className="text-xs text-brand-textMuted">Loading organizations...</div> : null}
        {!isLoading && memberships.length === 0 ? <div className="text-xs text-brand-textMuted">You are not a member of any organizations.</div> : null}

        <div className={memberships.length > 0 ? "border-t border-brand-borderMuted" : ""}>
          {memberships.map((membership) => (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-borderMuted px-1 py-3 last:border-b-0" key={membership.id}>
              <div className="grid gap-1">
                <p className="text-sm font-semibold">{membership.name}</p>
                <p className="text-[0.6875rem] text-brand-textMuted">
                  @{membership.handle}
                  <span className="ml-2 rounded-full border border-brand-borderMuted px-2 py-0.5 text-[0.625rem] font-medium">{membership.role}</span>
                </p>
              </div>
              <button
                className={dangerButtonClass}
                type="button"
                onClick={() => { setLeaveTarget(membership); }}
                disabled={isLeaving === membership.handle}
              >
                {isLeaving === membership.handle ? "Leaving..." : "Leave"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); }}>
        <div className="grid gap-3.5">
          <div className="grid place-items-center gap-2.5 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-[0.875rem] bg-brand-text text-[1.375rem] text-white">
              <span className="font-display">U</span>
            </div>
            <div>
              <p className="text-xl font-semibold">New organization</p>
              <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Create a shared workspace for your team.</p>
            </div>
          </div>
          {createError ? (
            <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-2.5 py-2 text-xs text-danger-text">{createError}</div>
          ) : null}
          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Handle
            <input className={lineInputClass} type="text" placeholder="acme" value={newHandle} onChange={(e) => { setNewHandle(e.target.value); }} />
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
    </section>
  );
}
