import type { ReactElement } from "react";
import { useEffect } from "react";

import Navbar from "components/Navbar";
import ProfileActivityHeatmap from "components/profile/ProfileActivityHeatmap";
import ProfileProjectsPanel from "components/profile/ProfileProjectsPanel";
import ProfileRunsPanel from "components/profile/ProfileRunsPanel";
import ProfileSidebar from "components/profile/ProfileSidebar";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";
import { useRunStore } from "store/runs";

export default function ProfileRoute(): ReactElement {
  const user = useAuthStore((state) => state.user);
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runsByKey = useRunStore((state) => state.runsByKey);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);

  useEffect(() => {
    if (user) { void fetchProjects(); }
  }, [fetchProjects, user]);

  useEffect(() => {
    if (user && !isProjectsLoading) { void fetchRuns(user.id); }
  }, [fetchRuns, isProjectsLoading, user]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar locationLabel="Profile" />

      <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[280px_1fr]">
        <ProfileSidebar user={user} projects={Object.values(projectsByKey)} runs={Object.values(runsByKey)} />

        <main className="p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{user?.handle ?? "workspace"}</p>
              <h1 className="mt-1 font-display text-3xl">Profile</h1>
              <p className="mt-2 text-[13px] text-brand-textMuted">A snapshot of your experiments, projects, and recent work.</p>
            </div>
          </header>

          <div className="grid gap-5">
            <ProfileProjectsPanel
              projects={Object.values(projectsByKey)}
              runs={Object.values(runsByKey)}
              userHandle={user?.handle ?? "workspace"}
              isLoading={isProjectsLoading}
              error={projectError}
            />
            <ProfileRunsPanel
              runs={Object.values(runsByKey)}
              projects={Object.values(projectsByKey)}
              userHandle={user?.handle ?? "user"}
              isLoading={isRunsLoading}
              error={runError}
            />
            <ProfileActivityHeatmap runs={Object.values(runsByKey)} />
          </div>
        </main>
      </div>
    </div>
  );
}
