import type { Project, User } from "@underfit/types";
import type { ReactElement } from "react";
import { Link } from "react-router-dom";

interface SidebarProps {
  readonly user: User | null;
  readonly projects: Project[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function Sidebar({ user, projects, isLoading, error }: SidebarProps): ReactElement {
  return (
    <aside className="flex h-full flex-col gap-5 border-b border-brand-border bg-[#f0f6f7] px-5 py-6 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-accent text-[22px] font-semibold text-white">
          <span className="font-display">U</span>
        </div>
        <div>
          <p className="text-[15px] font-semibold">Underfit</p>
          <p className="mt-1 text-xs text-brand-textMuted">Workspace</p>
        </div>
      </div>

      {user ? (
        <>
          <label className="flex w-full items-center gap-2 rounded-xl border border-brand-border bg-brand-surfaceMuted px-3 py-2">
            <span className="text-xs text-brand-textMuted">Search</span>
            <input className="flex-1 bg-transparent text-[13px] outline-none" placeholder="Find a project" />
          </label>

          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-textMuted">Top projects</p>
              <button className="rounded-full border border-brand-border bg-brand-surface px-2.5 py-1 text-xs" type="button">
                New
              </button>
            </div>
            {error ? <div className="px-1 py-1.5 text-xs text-brand-textMuted">{error}</div> : null}
            {!error && isLoading ? <div className="px-1 py-1.5 text-xs text-brand-textMuted">Loading projects...</div> : null}
            {!error && !isLoading ? (
              <div className="grid gap-2">
                {projects.map((project) => (
                  <Link
                    className="grid grid-cols-[32px_1fr] items-center gap-2.5 rounded-xl border border-transparent px-2 py-2 text-left text-inherit hover:border-brand-border hover:bg-brand-surface"
                    to={`/projects/${project.id}`}
                    key={project.id}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-[#d9ecec] text-[13px] font-semibold text-brand-accentStrong">
                      {project.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-sm font-semibold">{project.name}</span>
                      <span className="text-xs text-brand-textMuted">{user.handle}/{project.name}</span>
                    </span>
                  </Link>
                ))}
                {projects.length === 0 ? <div className="px-1 py-1.5 text-xs text-brand-textMuted">No projects yet.</div> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-auto flex items-center gap-3 border-t border-brand-border pt-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#d9ecec] font-semibold text-brand-accentStrong">
              {user.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{user.displayName}</p>
              <p className="mt-1 text-xs text-brand-textMuted">{user.email}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="px-1 py-1.5 text-xs text-brand-textMuted">Log in to view projects and runs.</div>
      )}
    </aside>
  );
}
