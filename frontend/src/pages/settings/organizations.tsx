import type { Organization, OrganizationRole } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";

import { useAuthStore } from "stores/auth";
import { createOrganization, fetchMyMemberships, leaveOrganization } from "stores/organizations";

type Membership = Organization & { role: OrganizationRole };

const inputClass = "rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none"
  + " focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";
const leaveButtonClass = "rounded-[10px] border border-[#fca5a5] bg-[#fef2f2] px-3 py-2 text-xs font-semibold"
  + " text-[#b42318] hover:border-[#f87171] hover:bg-[#fee2e2] disabled:cursor-wait disabled:opacity-70";

export default function SettingsOrganizationsContent(): ReactElement {
  const status = useAuthStore((state) => state.status);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLeaving, setIsLeaving] = useState<string | null>(null);

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
      setError("Handle and name are required.");
      return;
    }
    setIsCreating(true);
    setError(null);
    const result = await createOrganization(newHandle, newName);
    if (result.ok) {
      setMemberships((current) => [...current, { ...result.body, role: "ADMIN" }]);
      setNewHandle("");
      setNewName("");
    } else {
      setError(result.error);
    }
    setIsCreating(false);
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
    <section className="grid gap-4">
      <div className="grid gap-3 rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
        <p className="text-sm font-semibold">New organization</p>
        {error ? <p className="text-xs text-[#b42318]">{error}</p> : null}
        <div className="flex gap-2">
          <input
            className={inputClass + " flex-1"}
            type="text"
            placeholder="Handle (e.g. acme)"
            value={newHandle}
            onChange={(e) => { setNewHandle(e.target.value); }}
          />
          <input
            className={inputClass + " flex-1"}
            type="text"
            placeholder="Display name"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); }}
          />
          <button
            className="rounded-[10px] bg-brand-accent px-4 py-2.5 text-sm font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
            type="button"
            onClick={() => { void handleCreate(); }}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "New organization"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-[18px] border border-brand-border bg-brand-surface px-5 pb-3 pt-5 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Your organizations</p>
          <p className="text-xs text-brand-textMuted">{memberships.length} total</p>
        </div>
        {isLoading ? <div className="text-xs text-brand-textMuted">Loading organizations...</div> : null}
        {!isLoading && memberships.length === 0 ? <div className="text-xs text-brand-textMuted">You are not a member of any organizations.</div> : null}
        <div className={memberships.length > 0 ? "border-t border-brand-border" : ""}>
          {memberships.map((membership) => (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border px-1 py-3 last:border-b-0" key={membership.id}>
              <div className="grid gap-1">
                <p className="text-sm font-semibold">{membership.name}</p>
                <p className="text-[11px] text-brand-textMuted">
                  @{membership.handle}
                  <span className="ml-2 rounded-full border border-brand-border px-2 py-0.5 text-[10px] font-medium">{membership.role}</span>
                </p>
              </div>
              <button
                className={leaveButtonClass}
                type="button"
                onClick={() => { void handleLeave(membership.handle); }}
                disabled={isLeaving === membership.handle}
              >
                {isLeaving === membership.handle ? "Leaving..." : "Leave"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
