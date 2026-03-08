import type { ReactElement } from "react";
import { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";

import RunsPanel from "components/RunsPanel";
import Sidebar from "components/Sidebar";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";
import { useRunStore } from "store/runs";

export default function IndexRoute(): ReactElement {
  const sessionToken = useMemo(() => localStorage.getItem("underfitSessionToken") ?? "", []);
  const user = useAuthStore((state) => state.user);
  const userError = useAuthStore((state) => state.error);
  const authFailed = useAuthStore((state) => state.authFailed);
  const loadUser = useAuthStore((state) => state.loadUser);
  const projects = useProjectStore((state) => state.projects);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runs = useRunStore((state) => state.runs);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);
  useEffect(() => {
    void loadUser(sessionToken);
  }, [loadUser, sessionToken]);

  useEffect(() => {
    if (sessionToken) { void fetchProjects(sessionToken); }
  }, [fetchProjects, sessionToken]);

  useEffect(() => {
    if (sessionToken && user) { void fetchRuns(user.id, sessionToken); }
  }, [fetchRuns, sessionToken, user]);

  if (!sessionToken || authFailed) { return <Navigate replace to="/login" />; }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text lg:grid lg:grid-cols-[280px_1fr]">
      <Sidebar user={user} projects={projects} isLoading={isProjectsLoading} error={projectError} />

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

        {userError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{userError}</div> : null}

        <RunsPanel runs={runs} projects={projects} isLoading={isRunsLoading} error={runError} />
      </main>
    </div>
  );
}
