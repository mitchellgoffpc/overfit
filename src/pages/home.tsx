import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import { Link } from "wouter";

import WorkspaceRunsTable from "components/home/WorkspaceRunsTable";
import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import SectionHeader from "components/SectionHeader";
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
  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar breadcrumbs={[{ label: "Home" }]} />

      <NotebookShell columns="18.75rem 1fr" className="max-w-full md:max-w-[calc(100%-5rem)]">

        <aside className="relative border-b border-brand-borderMuted px-4 pb-5 lg:border-b-0 lg:border-r lg:pb-6 lg:pr-5">
          <SectionHeader title="Home" subtitle={`@${userHandle}`} sectionLabel="Lab Notebook" />

          <div className="mt-3 rounded-xl border border-brand-borderMuted bg-white/85 px-3 py-3">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Run Ledger</p>
            <div className="mt-2 flex items-center justify-between text-[0.75rem]">
              <span className="text-brand-textMuted">total</span>
              <span className="font-semibold">{runs.length}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[0.75rem]">
              <span className="text-brand-textMuted">running</span>
              <span className="font-semibold text-signal-accent">{runningCount}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[0.75rem]">
              <span className="text-brand-textMuted">failed</span>
              <span className="font-semibold text-signal-failed">{failedCount}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-brand-borderMuted bg-white/85 px-3 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Projects</p>
              <span className="rounded-full border border-brand-borderMuted bg-white px-2 py-0.5 text-[0.625rem] font-semibold text-brand-textMuted">
                {projects.length}
              </span>
            </div>
            {projectError ? <div className="py-1 text-[0.75rem] text-brand-textMuted">{projectError}</div> : null}
            {!projectError && isProjectsLoading ? <div className="py-1 text-[0.75rem] text-brand-textMuted">Loading projects...</div> : null}
            {!projectError && !isProjectsLoading ? (
              <div className="grid gap-1.5">
                {projects.map((project) => (
                  <Link
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.75rem] hover:bg-hover"
                    href={`/${userHandle}/${project.name}`}
                    key={project.id}
                  >
                    <span className="h-2 w-2 rounded-full bg-signal-accent" />
                    <span className="truncate font-semibold">{project.name}</span>
                  </Link>
                ))}
                {projects.length === 0 ? <div className="py-1 text-[0.75rem] text-brand-textMuted">No projects yet.</div> : null}
              </div>
            ) : null}
          </div>
        </aside>

        <main className="relative min-w-0 px-4 pb-5 lg:px-5 lg:pb-6">
          <SectionHeader title="Runs" subtitle={`${String(runs.length)} total`} />
          <WorkspaceRunsTable runs={runs} isLoading={isRunsLoading} error={runError} />
        </main>
      </NotebookShell>
    </div>
  );
}
