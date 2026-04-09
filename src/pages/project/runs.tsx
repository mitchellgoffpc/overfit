import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import NotebookShell from "components/NotebookShell";
import ProjectHeader from "components/project/ProjectHeader";
import ProjectRunsTable from "components/project/RunsTable";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { fetchRuns, getProjectRuns, useRunStore } from "stores/runs";

export default function ProjectRunsPage(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projectKey = buildProjectKey(handle, projectName);
  const project = useProjectStore((state) => state.projects[projectKey]);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const runError = useRunStore((state) => state.errors[projectKey] ?? null);
  const isRunsLoading = useRunStore((state) => state.isLoading[projectKey] ?? false);
  const projectRuns = useRunStore(useShallow(getProjectRuns(project?.id ?? "")));

  useEffect(() => {
    if (!isProjectsLoading) { void fetchRuns(handle, projectName); }
  }, [handle, isProjectsLoading, projectName]);
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
