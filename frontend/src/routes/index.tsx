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
  const isAuthenticated = Boolean(sessionToken && user);

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
    <div className="layout">
      <Sidebar user={user} projects={projects} isLoading={isProjectsLoading} error={projectError} />

      <main className="main">
        <header className="main__header">
          <div>
            <p className="main__kicker">{user?.handle}</p>
            <h1 className="main__title">Home</h1>
          </div>
          <div className="main__cta-row">
            <button className="main__cta main__cta--ghost" type="button">
              View reports
            </button>
            <button className="main__cta" type="button">
              + New run
            </button>
          </div>
        </header>

        {userError ? <div className="panel__empty panel__empty--page">{userError}</div> : null}

        <RunsPanel runs={runs} projects={projects} isLoading={isRunsLoading} error={runError} />
      </main>
    </div>
  );
}
