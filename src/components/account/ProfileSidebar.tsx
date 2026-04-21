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
  const asideClass = "relative flex h-full flex-col px-4 lg:border-r lg:pr-5";
  const asideStyle = { paddingTop: `${String(RULED_LINE_HEIGHT)}rem` };

  if (!user) {
    return (
      <aside className={asideClass} style={asideStyle}>
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>User Data</p>
          <h2 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Profile</h2>
        </div>
        <div className="relative px-1 py-1.5 text-xs text-brand-textMuted">Log in to view profile.</div>
      </aside>
    );
  }

  const name = user.name;
  const bio = user.bio || "Building transparent model reporting with Underfit.";
  const avatarSize = `calc(${RULED_LINE} * 2.75)`;
  const identityBlockStyle = {
    columnGap: `calc(${RULED_LINE} * 0.5)`,
    height: `calc(${RULED_LINE} * 4)`,
    alignContent: "center" as const,
  };
  const bioClampStyle = {
    WebkitBoxOrient: "vertical" as const,
    WebkitLineClamp: 3,
    display: "-webkit-box",
    lineHeight: RULED_LINE,
  };
  const statsSectionStyle = { height: `calc(${RULED_LINE} * 5)` };
  const statsCardStyle = { height: `calc(${RULED_LINE} * 4.25)` };
  const statsRowStyle = { minHeight: RULED_LINE, lineHeight: RULED_LINE };

  return (
    <aside className={asideClass} style={asideStyle}>
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>User Data</p>
        <h2 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Profile</h2>
      </div>

      <div className="relative">
        <div className="grid grid-cols-[auto_1fr] items-center" style={identityBlockStyle}>
          <Avatar
            handle={user.handle}
            name={name}
            className="shrink-0 text-xl"
            style={{ width: avatarSize, height: avatarSize }}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-text" style={{ lineHeight: RULED_LINE }}>{name}</p>
            <p className="truncate text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>@{user.handle}</p>
          </div>
        </div>
        <p className="overflow-hidden text-[0.8125rem] text-brand-textMuted" style={bioClampStyle}>{bio}</p>
      </div>

      <div className="relative flex items-center" style={statsSectionStyle}>
        <div className="flex w-full flex-col justify-center rounded-2xl border border-brand-borderMuted bg-white/85 px-4 text-sm" style={statsCardStyle}>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Stats</p>
          <div className="flex min-w-0 items-center justify-between gap-3" style={statsRowStyle}>
            <span className="truncate whitespace-nowrap text-brand-textMuted">Projects</span>
            <span className="shrink-0 whitespace-nowrap font-semibold">{projects.length}</span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3" style={statsRowStyle}>
            <span className="truncate whitespace-nowrap text-brand-textMuted">Runs</span>
            <span className="shrink-0 whitespace-nowrap font-semibold">{runs.length}</span>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-3" style={statsRowStyle}>
            <span className="truncate whitespace-nowrap text-brand-textMuted">Member since</span>
            <span className="shrink-0 whitespace-nowrap font-semibold">{formatDate(user.createdAt, { month: "short", year: "numeric" })}</span>
          </div>
        </div>
      </div>

      {isOwnProfile ? (
        <div className="flex items-center" style={{ height: `calc(${RULED_LINE} * 2)` }}>
          <Link
            className={`${editProfileClass} w-full`}
            href="/settings/profile"
          >
            Edit profile
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
