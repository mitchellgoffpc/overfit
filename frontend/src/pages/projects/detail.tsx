import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import Navbar from "components/Navbar";
import ProjectRunsTable from "components/ProjectRunsTable";
import Sidebar from "components/Sidebar";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";
import { useRunStore } from "store/runs";

export default function ProjectDetailRoute(): ReactElement {
  const { projectId } = useParams();
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

  const project = projects.find((item) => item.id === projectId);
  const projectRuns = runs.filter((run) => run.projectId === projectId);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar user={user} locationLabel={project?.name ?? "Project"} />

      <div className="lg:grid lg:grid-cols-[280px_1fr]">
        <Sidebar user={user} projects={projects} isLoading={isProjectsLoading} error={projectError} />

        <main className="p-6 lg:p-8">
          <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{user?.handle}</p>
              <h1 className="mt-1 font-display text-3xl">{project?.name ?? "Project"}</h1>
              {project?.description ? <p className="mt-1 text-sm text-brand-textMuted">{project.description}</p> : null}
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

          {!project && !isProjectsLoading ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">Project not found.</div> : null}
          {project ? (
            <ProjectRunsTable
              runs={projectRuns}
              project={project}
              user={user}
              isLoading={isRunsLoading || isProjectsLoading}
              error={runError ?? projectError}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
