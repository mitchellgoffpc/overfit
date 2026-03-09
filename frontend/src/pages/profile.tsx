import type { ReactElement } from "react";
import { useEffect } from "react";

import Navbar from "components/Navbar";
import ProfileActivityHeatmap from "components/ProfileActivityHeatmap";
import ProfileProjectsPanel from "components/ProfileProjectsPanel";
import ProfileRunsPanel from "components/ProfileRunsPanel";
import ProfileSidebar from "components/ProfileSidebar";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";
import { useRunStore } from "store/runs";

export default function ProfileRoute(): ReactElement {
  const user = useAuthStore((state) => state.user);
  const projects = useProjectStore((state) => state.projects);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runs = useRunStore((state) => state.runs);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (user) { void fetchRuns(user.id); }
  }, [fetchRuns, user]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar user={user} locationLabel="Profile" />

      <div className="lg:grid lg:grid-cols-[280px_1fr]">
        <ProfileSidebar user={user} projects={projects} runs={runs} />

        <main className="p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{user?.handle ?? "workspace"}</p>
              <h1 className="mt-1 font-display text-3xl">Profile</h1>
              <p className="mt-2 text-[13px] text-brand-textMuted">A snapshot of your experiments, projects, and recent work.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 font-semibold text-brand-text shadow-none" type="button">
                Share profile
              </button>
              <button className="rounded-xl bg-brand-accent px-4 py-2.5 font-semibold text-white shadow-soft" type="button">
                + New project
              </button>
            </div>
          </header>

          <div className="grid gap-5">
            <ProfileProjectsPanel projects={projects} runs={runs} isLoading={isProjectsLoading} error={projectError} />
            <ProfileActivityHeatmap runs={runs} />
            <ProfileRunsPanel runs={runs} projects={projects} userHandle={user?.handle ?? "user"} isLoading={isRunsLoading} error={runError} />
          </div>
        </main>
      </div>
    </div>
  );
}
