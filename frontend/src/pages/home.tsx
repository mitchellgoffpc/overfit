import type { ReactElement } from "react";
import { useEffect } from "react";

import Navbar from "components/Navbar";
import RunsPanel from "components/RunsPanel";
import Sidebar from "components/Sidebar";
import { useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";
import { useUsersStore } from "stores/users";

export default function IndexRoute(): ReactElement {
  const user = useUsersStore((state) => state.user);
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar locationLabel="Home" />

      <div className="lg:grid lg:grid-cols-[280px_1fr]">
        <Sidebar user={user} projects={Object.values(projectsByKey)} isLoading={isProjectsLoading} error={projectError} />

        <main className="p-6 lg:p-8">
          <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{user?.handle}</p>
              <h1 className="mt-1 font-display text-3xl">Home</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 font-semibold text-brand-text shadow-none" type="button">
                View reports
              </button>
              <button className="rounded-xl bg-brand-accent px-4 py-2.5 font-semibold text-white shadow-soft" type="button">
                + New run
              </button>
            </div>
          </header>

          <RunsPanel
            runs={Object.values(runsByKey)}
            projects={Object.values(projectsByKey)}
            userHandle={user?.handle ?? "workspace"}
            isLoading={isRunsLoading}
            error={runError}
          />
        </main>
      </div>
    </div>
  );
}
