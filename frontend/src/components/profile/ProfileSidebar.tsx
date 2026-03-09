import type { Project, Run, User } from "@underfit/types";
import type { ReactElement } from "react";

import { formatDate } from "helpers";

interface ProfileSidebarProps {
  readonly user: User | null;
  readonly projects: Project[];
  readonly runs: Run[];
}

export default function ProfileSidebar({ user, projects, runs }: ProfileSidebarProps): ReactElement {
  if (!user) {
    return (
      <aside className="flex h-full flex-col gap-5 border-b border-brand-border bg-[#f0f6f7] px-5 py-6 lg:border-b-0 lg:border-r">
        <div className="px-1 py-1.5 text-xs text-brand-textMuted">Log in to view profile.</div>
      </aside>
    );
  }

  const displayName = user.name ?? user.displayName;
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const bio = user.bio ?? "Building transparent model reporting with Underfit.";

  return (
    <aside className="flex h-full flex-col gap-5 border-b border-brand-border bg-[#f0f6f7] px-5 py-6 lg:border-b-0 lg:border-r">
      <div className="grid gap-4">
        <div className="grid place-items-center">
          <div className="grid h-24 w-24 place-items-center rounded-full bg-[radial-gradient(circle_at_top,_#d6f3ee,_#9acdd0)] text-2xl font-semibold text-[#1f4d4f]">
            {initials}
          </div>
        </div>
        <div className="grid gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{displayName}</p>
            <p className="text-xs text-brand-textMuted">@{user.handle}</p>
          </div>
          <p className="text-[13px] text-brand-textMuted">{bio}</p>
        </div>
        <button className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-sm font-semibold text-brand-text" type="button">
          Edit profile
        </button>
      </div>

      <div className="grid gap-3 rounded-[16px] border border-brand-border bg-brand-surface px-4 py-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-brand-textMuted">Projects</span>
          <span className="font-semibold">{projects.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-brand-textMuted">Runs</span>
          <span className="font-semibold">{runs.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-brand-textMuted">Member since</span>
          <span className="font-semibold">{formatDate(user.createdAt, { month: "short", year: "numeric" })}</span>
        </div>
      </div>

      <div className="grid gap-2 rounded-[16px] border border-brand-border bg-brand-surface px-4 py-4 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-textMuted">Links</p>
        <div className="grid gap-1.5 text-[13px]">
          <span className="text-brand-text">{user.email}</span>
          <span className="text-brand-textMuted">underfit.dev/{user.handle}</span>
          <span className="text-brand-textMuted">San Diego, CA</span>
        </div>
      </div>
    </aside>
  );
}
