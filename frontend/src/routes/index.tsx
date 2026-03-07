import { API_VERSION } from "@overfit/types";
import type { User } from "@overfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";

import RunsPanel from "components/RunsPanel";
import Sidebar from "components/Sidebar";
import { useProjectStore } from "store/projects";
import { useRunStore } from "store/runs";

const FALLBACK_USER: User = {
  id: "user-mitchell",
  email: "mitchell@overfit.local",
  handle: "mitchellgoffpc",
  displayName: "Mitchell Goff",
  createdAt: "2024-05-20T16:20:00Z",
  updatedAt: "2024-10-12T09:15:00Z"
};

export default function IndexRoute(): ReactElement {
  const [user, setUser] = useState<User>(FALLBACK_USER);
  const [userError, setUserError] = useState<string | null>(null);
  const sessionToken = useMemo(() => localStorage.getItem("overfitSessionToken") ?? "", []);
  const projects = useProjectStore((state) => state.projects);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runs = useRunStore((state) => state.runs);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);
  const apiBase = useMemo(() => `http://localhost:4000/api/${API_VERSION}`, []);

  useEffect(() => {
    if (!sessionToken) { return; }

    const loadUser = async () => {
      setUserError(null);
      try {
        const response = await fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${sessionToken}` } });
        if (!response.ok) {
          setUserError(`Failed to load user (${String(response.status)})`);
          return;
        }
        const loadedUser = (await response.json()) as User;
        setUser(loadedUser);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load user";
        setUserError(message);
      }
    };

    void loadUser();
  }, [apiBase, sessionToken]);

  useEffect(() => {
    if (sessionToken) { void fetchProjects(sessionToken); }
  }, [fetchProjects, sessionToken]);

  useEffect(() => {
    if (sessionToken) { void fetchRuns(user.id, sessionToken); }
  }, [fetchRuns, sessionToken, user.id]);

  return (
    <div className="layout">
      <Sidebar user={user} projects={projects} isLoading={isProjectsLoading} error={projectError} />

      <main className="main">
        <header className="main__header">
          <div>
            <p className="main__kicker">{user.handle}</p>
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
