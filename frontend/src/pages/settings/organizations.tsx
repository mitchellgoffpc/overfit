import type { Organization, OrganizationRole } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

import Modal from "components/Modal";
import { useAuthStore } from "stores/auth";
import { createOrganization, fetchMyMemberships, leaveOrganization } from "stores/organizations";

type Membership = Organization & { role: OrganizationRole };

const inkButtonClass = "rounded-[10px] border border-[#1f3637] bg-[#1f3637] px-4 py-2 text-sm font-semibold text-white"
  + " transition hover:bg-[#152a2b] disabled:cursor-wait disabled:opacity-70";
const paperButtonClass = "rounded-[10px] border border-[#cfd8d8] bg-white px-3 py-2 text-xs font-semibold"
  + " text-brand-text transition hover:bg-[#f5f9f9] disabled:cursor-wait disabled:opacity-70";
const lineInputClass = "w-full rounded-[10px] border border-[#d2dddd] bg-white/70 px-3 py-2.5 text-sm"
  + " outline-none transition focus:border-brand-accent";
const leaveButtonClass = "rounded-[10px] border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs font-semibold"
  + " text-[#b42318] hover:border-[#f87171] hover:bg-[#fee2e2] disabled:cursor-wait disabled:opacity-70";

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
  const notebookDate = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    []
  );

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
    <section className="grid lg:grid-cols-[300px_1fr]">
      <aside className="border-b border-[#d2dfdf] px-5 py-5 lg:border-b-0 lg:border-r lg:border-[#d2dfdf] lg:pl-14 lg:pr-5 lg:pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
        <h2 className="mt-1 font-display text-[34px] leading-none text-brand-text">Settings</h2>
        <p className="mt-2 font-mono text-[11px] text-brand-textMuted" style={{ lineHeight: "30px" }}>{notebookDate}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] mt-[28px] text-brand-textMuted" style={{ lineHeight: "30px" }}>Summary</p>
        <div className="flex items-center justify-between text-[12px]" style={{ height: "30px" }}>
          <span className="text-brand-textMuted">memberships</span>
          <span className="font-semibold text-brand-text">{memberships.length}</span>
        </div>
      </aside>

      <div className="relative p-6">
        <header className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Section B</p>
          <h2 className="mt-1 font-display text-[34px] leading-none text-brand-text">Organizations</h2>
        </header>

        <div className="flex flex-wrap gap-2 mb-[30px]">
          {error ? <div className="rounded-[10px] border border-[#f7c1c1] bg-[#fff0ef] px-3 py-1.5 text-xs text-[#8f2d2d]">{error}</div> : null}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">Your organizations</p>
          <button className={inkButtonClass} type="button" onClick={openCreateModal}>New organization</button>
        </div>

        {isLoading ? <div className="text-xs text-brand-textMuted">Loading organizations...</div> : null}
        {!isLoading && memberships.length === 0 ? <div className="text-xs text-brand-textMuted">You are not a member of any organizations.</div> : null}

        <div className={memberships.length > 0 ? "border-t border-[#d2dfdf]" : ""}>
          {memberships.map((membership) => (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d2dfdf] px-1 py-3 last:border-b-0" key={membership.id}>
              <div className="grid gap-1">
                <p className="text-sm font-semibold">{membership.name}</p>
                <p className="text-[11px] text-brand-textMuted">
                  @{membership.handle}
                  <span className="ml-2 rounded-full border border-[#d2dfdf] px-2 py-0.5 text-[10px] font-medium">{membership.role}</span>
                </p>
              </div>
              <button
                className={leaveButtonClass}
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
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-brand-text text-[22px] text-white">
              <span className="font-display">U</span>
            </div>
            <div>
              <p className="text-xl font-semibold">New organization</p>
              <p className="mt-1 text-[13px] text-brand-textMuted">Create a shared workspace for your team.</p>
            </div>
          </div>
          {createError ? <div className="rounded-[10px] border border-[#fecaca] bg-[#fee4e2] px-2.5 py-2 text-xs text-[#b42318]">{createError}</div> : null}
          <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
            Handle
            <input className={lineInputClass} type="text" placeholder="acme" value={newHandle} onChange={(e) => { setNewHandle(e.target.value); }} />
          </label>
          <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
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
              className={leaveButtonClass}
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
