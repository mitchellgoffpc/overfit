import type { ReactElement } from "react";
import { Link } from "wouter";

import Avatar from "components/Avatar";
import { RULED_LINE, RULED_LINE_HEIGHT, formatDate } from "helpers";
import type { Project, Run, User } from "types";

interface ProfileSidebarProps {
  readonly user: User | null;
  readonly projects: Project[];
  readonly runs: Run[];
  readonly isOwnProfile: boolean;
}

export default function ProfileSidebar({ user, projects, runs, isOwnProfile }: ProfileSidebarProps): ReactElement {
  const editProfileClass = "rounded-xl border border-ink bg-ink px-4 py-2 text-center text-sm font-semibold"
    + " text-white no-underline transition hover:bg-ink-hover";
  const asideClass = "relative flex h-full flex-col gap-4 border-b border-brand-borderMuted px-4 pb-5 lg:border-b-0 lg:border-r lg:pb-6 lg:pr-5";
  const asideStyle = { paddingTop: `${String(RULED_LINE_HEIGHT)}rem` };

  if (!user) {
    return (
      <aside className={asideClass} style={asideStyle}>
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Profile Ledger</p>
          <h2 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Profile</h2>
        </div>
        <div className="relative px-1 py-1.5 text-xs text-brand-textMuted">Log in to view profile.</div>
      </aside>
    );
  }

  const name = user.name;
  const bio = user.bio || "Building transparent model reporting with Underfit.";

  return (
    <aside className={asideClass} style={asideStyle}>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Profile Ledger</p>
        <h2 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Profile</h2>
      </div>

      <div className="relative grid gap-4">
        <div className="rounded-[0.875rem] border border-brand-borderMuted bg-white/85 p-3">
          <div className="grid place-items-center">
            <Avatar handle={user.handle} name={name} className="h-24 w-24 border border-brand-borderStrong text-2xl" />
          </div>
          <div className="mt-3 grid gap-2 text-center">
            <div>
              <p className="text-lg font-semibold">{name}</p>
              <p className="text-xs text-brand-textMuted">@{user.handle}</p>
            </div>
            <p className="text-[0.8125rem] text-brand-textMuted">{bio}</p>
          </div>
        </div>
        {isOwnProfile ? (
          <Link
            className={editProfileClass}
            href="/settings/profile"
          >
            Edit profile
          </Link>
        ) : null}
      </div>

      <div className="relative grid gap-3 rounded-2xl border border-brand-borderMuted bg-white/85 px-4 py-4 text-sm">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">Stats</p>
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

      <div className="relative grid gap-2 rounded-2xl border border-brand-borderMuted bg-white/85 px-4 py-4 text-sm">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">Links</p>
        <div className="grid gap-1.5 text-[0.8125rem]">
          <span className="text-brand-text">{user.email}</span>
          <span className="text-brand-textMuted">underfit.dev/{user.handle}</span>
          <span className="text-brand-textMuted">San Diego, CA</span>
        </div>
      </div>
    </aside>
  );
}
