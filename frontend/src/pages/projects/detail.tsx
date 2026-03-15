import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import Navbar from "components/Navbar";
import ProjectRunsTable from "components/ProjectRunsTable";
import Sidebar from "components/Sidebar";
import { useAccountsStore } from "stores/accounts";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";

export default function ProjectDetailRoute(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const user = useAccountsStore((state) => state.me());
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const runsByKey = useRunStore((state) => state.runsByKey);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [fetchProjects, handle]);

  useEffect(() => {
    if (user && !isProjectsLoading) { void fetchRuns(user.handle); }
  }, [fetchRuns, isProjectsLoading, user]);

  const projectList = Object.values(projectsByKey);
  const runList = Object.values(runsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);
  useEffect(() => {
    if (!project) { void fetchProject(handle, projectName); }
  }, [fetchProject, handle, project, projectName]);
  const projectRuns = project ? runList.filter((run) => run.projectId === project.id) : [];
  const showProjectNotFound = !project && !isProjectsLoading;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar locationLabel={projectName} ownerLabel={handle} ownerHref={`/${handle}`} />

      <div className="lg:grid lg:grid-cols-[280px_1fr]">
        <Sidebar user={user} projects={projectList} isLoading={isProjectsLoading} error={projectError} />

        <main className="p-6 lg:p-8">
          <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{handle}</p>
              <h1 className="mt-1 font-display text-3xl">{projectName}</h1>
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

          {showProjectNotFound ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
          {project ? (
            <ProjectRunsTable
              runs={projectRuns}
              project={project}
              user={user}
              ownerHandle={handle}
              isLoading={isRunsLoading || isProjectsLoading}
              error={runError ?? projectError}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
