import type { Project, Run, User } from "@underfit/types";
import type { ReactElement } from "react";
import { Link } from "wouter";

import { apiBase, formatDate } from "helpers";

interface ProfileSidebarProps {
  readonly user: User | null;
  readonly projects: Project[];
  readonly runs: Run[];
  readonly isOwnProfile: boolean;
}

export default function ProfileSidebar({ user, projects, runs, isOwnProfile }: ProfileSidebarProps): ReactElement {
  const avatarClass = "relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-[#bfd0d0]"
    + " bg-[#d9ecec] text-2xl font-semibold text-brand-accentStrong";
  const editProfileClass = "rounded-xl border border-[#203738] bg-[#203738] px-4 py-2 text-center text-sm font-semibold"
    + " text-white no-underline transition hover:bg-[#16292a]";

  if (!user) {
    return (
      <aside className="relative flex h-full flex-col gap-5 border-b border-[#d4dddd] px-5 py-6 lg:border-b-0 lg:border-r">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.16) 1px, transparent 1px)", backgroundSize: "100% 30px" }}
        />
        <div className="relative px-1 py-1.5 text-xs text-brand-textMuted">Log in to view profile.</div>
      </aside>
    );
  }

  const name = user.name;
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const bio = user.bio ?? "Building transparent model reporting with Underfit.";
  const avatarSrc = `${apiBase}/accounts/${encodeURIComponent(user.handle)}/avatar`;

  return (
    <aside className="relative flex h-full flex-col gap-5 border-b border-[#d4dddd] px-5 py-6 lg:border-b-0 lg:border-r">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.16) 1px, transparent 1px)", backgroundSize: "100% 30px" }}
      />

      <div className="relative grid gap-4">
        <div className="rounded-[14px] border border-[#d4dede] bg-white/85 p-3">
          <div className="grid place-items-center">
            <div className={avatarClass}>
              {initials}
              <img
                key={user.handle}
                className="absolute inset-0 h-full w-full object-cover"
                src={avatarSrc}
                alt={`${name} avatar`}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-center">
            <div>
              <p className="text-lg font-semibold">{name}</p>
              <p className="text-xs text-brand-textMuted">@{user.handle}</p>
            </div>
            <p className="text-[13px] text-brand-textMuted">{bio}</p>
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

      <div className="relative grid gap-3 rounded-[16px] border border-[#d4dede] bg-white/85 px-4 py-4 text-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-textMuted">Stats</p>
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

      <div className="relative grid gap-2 rounded-[16px] border border-[#d4dede] bg-white/85 px-4 py-4 text-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-textMuted">Links</p>
        <div className="grid gap-1.5 text-[13px]">
          <span className="text-brand-text">{user.email}</span>
          <span className="text-brand-textMuted">underfit.dev/{user.handle}</span>
          <span className="text-brand-textMuted">San Diego, CA</span>
        </div>
      </div>
    </aside>
  );
}
