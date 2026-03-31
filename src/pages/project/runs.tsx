import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import NotebookShell from "components/NotebookShell";
import ProjectHeader from "components/project/ProjectHeader";
import ProjectRunsTable from "components/project/RunsTable";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";

export default function ProjectRunsPage(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const runsByKey = useRunStore((state) => state.runsByKey);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchProjectRuns = useRunStore((state) => state.fetchProjectRuns);

  useEffect(() => {
    if (!isProjectsLoading) { void fetchProjectRuns(handle, projectName); }
  }, [fetchProjectRuns, handle, isProjectsLoading, projectName]);

  const projectList = Object.values(projectsByKey);
  const runList = Object.values(runsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);
  const projectRuns = project ? runList.filter((run) => run.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const showProjectNotFound = !project && !isProjectsLoading;

  return (
      <NotebookShell className="max-w-full md:max-w-[calc(100%-5rem)]">
        <div className="pointer-events-none absolute bottom-0 left-[18.25rem] top-0 w-px bg-brand-borderMuted" aria-hidden />

        <div className="relative pb-5 pl-4 pr-5" style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}>
          <header className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: RULED_LINE }}>
            <ProjectHeader handle={handle} projectName={projectName} />
            {project ? (
              <span className="hidden rounded-full border border-brand-borderMuted bg-white/90 px-3 py-1 text-[0.75rem] text-brand-textMuted xs:block">
                {project.visibility === "public" ? "Public" : "Private"}
              </span>
            ) : null}
          </header>

          {showProjectNotFound ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
          {project ? (
            <ProjectRunsTable
              runs={projectRuns}
              project={project}
              ownerHandle={handle}
              isLoading={isRunsLoading || isProjectsLoading}
              error={runError ?? projectError}
            />
          ) : null}
        </div>
      </NotebookShell>
  );
}
