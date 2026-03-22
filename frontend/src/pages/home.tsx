import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import { Link } from "wouter";

import Navbar from "components/Navbar";
import RunsPanel from "components/RunsPanel";
import { useAccountsStore } from "stores/accounts";
import { useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";

export default function IndexRoute(): ReactElement {
  const user = useAccountsStore((state) => state.me());
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runsByKey = useRunStore((state) => state.runsByKey);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);

  useEffect(() => {
    if (user?.handle) { void fetchProjects(user.handle); }
  }, [fetchProjects, user]);

  useEffect(() => {
    if (user && !isProjectsLoading) { void fetchRuns(user.handle); }
  }, [fetchRuns, isProjectsLoading, user]);
  const projects = useMemo(() => Object.values(projectsByKey).sort((a, b) => a.name.localeCompare(b.name)), [projectsByKey]);
  const runs = useMemo(() => Object.values(runsByKey).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [runsByKey]);
  const runningCount = useMemo(() => runs.filter((run) => run.status === "running").length, [runs]);
  const failedCount = useMemo(() => runs.filter((run) => run.status === "failed").length, [runs]);
  const userHandle = user?.handle ?? "workspace";
  const notebookShellClass = "relative mx-auto w-full overflow-hidden border-x border-b border-[#c4d1d1]"
    + " bg-[#f8fcfa] shadow-[0_0.875rem_2.25rem_rgba(30,52,52,0.18)] lg:grid lg:grid-cols-[18.75rem_1fr]";

  return (
    <div className="min-h-screen bg-[#e9efed] text-brand-text">
      <Navbar breadcrumbs={[{ label: "Home" }]} />

      <div className={notebookShellClass} style={{ maxWidth: "calc(100% - 5rem)" }}>
        <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[0.875rem] bg-[#dce7e4]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.2) 1px, transparent 1px)", backgroundSize: "100% 1.875rem" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-10 top-0 w-px bg-[#efb1b1]/70" aria-hidden />

        <aside className="relative border-b border-[#d2dfdf] px-5 py-5 lg:border-b-0 lg:border-r lg:pl-14 lg:pr-5 lg:py-6">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
          <h1 className="mt-1 font-display text-[2.0625rem] leading-none text-brand-text">Home</h1>
          <p className="mt-1 font-mono text-[0.6875rem] text-brand-textMuted">@{userHandle} / dashboard</p>

          <div className="mt-3 rounded-xl border border-[#d2dede] bg-white/85 px-3 py-3">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Run Ledger</p>
            <div className="mt-2 flex items-center justify-between text-[0.75rem]">
              <span className="text-brand-textMuted">total</span>
              <span className="font-semibold">{runs.length}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[0.75rem]">
              <span className="text-brand-textMuted">running</span>
              <span className="font-semibold text-[#2d7172]">{runningCount}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[0.75rem]">
              <span className="text-brand-textMuted">failed</span>
              <span className="font-semibold text-[#bb5f5f]">{failedCount}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#d2dede] bg-white/85 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Projects</p>
              <span className="rounded-full border border-[#d0dddd] bg-white px-2 py-0.5 text-[0.625rem] font-semibold text-brand-textMuted">
                {projects.length}
              </span>
            </div>
            {projectError ? <div className="py-1 text-[0.75rem] text-brand-textMuted">{projectError}</div> : null}
            {!projectError && isProjectsLoading ? <div className="py-1 text-[0.75rem] text-brand-textMuted">Loading projects...</div> : null}
            {!projectError && !isProjectsLoading ? (
              <div className="grid gap-1.5">
                {projects.map((project) => (
                  <Link
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.75rem] hover:bg-[#edf5f3]"
                    href={`/${userHandle}/${project.name}`}
                    key={project.id}
                  >
                    <span className="h-2 w-2 rounded-full bg-[#2d7172]" />
                    <span className="truncate font-semibold">{project.name}</span>
                  </Link>
                ))}
                {projects.length === 0 ? <div className="py-1 text-[0.75rem] text-brand-textMuted">No projects yet.</div> : null}
              </div>
            ) : null}
          </div>
        </aside>

        <main className="relative p-6">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d4dfdf] pb-3">
            <div>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Section H</p>
              <h2 className="mt-1 font-display text-[2.125rem] leading-none text-brand-text">Workspace Activity</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-lg border border-[#c2d7d6] bg-[#eff6f5] px-3 py-1.5 text-[0.75rem] font-semibold text-brand-text transition hover:bg-white"
                type="button"
              >
                View reports
              </button>
              <button
                className={"rounded-lg border border-[#b9d4d3] bg-[#d9eceb] px-3 py-1.5"
                  + " text-[0.75rem] font-semibold text-brand-text transition hover:bg-[#e6f3f2]"}
                type="button"
              >
                + New run
              </button>
            </div>
          </header>

          <RunsPanel runs={runs} projects={projects} userHandle={userHandle} isLoading={isRunsLoading} error={runError} />
        </main>
      </div>
    </div>
  );
}
