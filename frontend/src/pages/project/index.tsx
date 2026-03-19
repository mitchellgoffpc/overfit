import type { ReactElement } from "react";
import { useEffect } from "react";
import { Redirect, Route, Switch, useParams } from "wouter";

import Navbar from "components/Navbar";
import ProjectRunsTable from "components/ProjectRunsTable";
import { apiBase } from "helpers";
import ProjectComparePage from "pages/project/compare";
import RunDetailPage from "pages/project/run";
import ProjectSettingsPage from "pages/project/settings";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";

function ProjectRunsContent(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const fetchProject = useProjectStore((state) => state.fetchProject);
  const runsByKey = useRunStore((state) => state.runsByKey);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchProjectRuns = useRunStore((state) => state.fetchProjectRuns);

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [fetchProjects, handle]);

  useEffect(() => {
    if (!isProjectsLoading) { void fetchProjectRuns(handle, projectName); }
  }, [fetchProjectRuns, handle, isProjectsLoading, projectName]);

  const projectList = Object.values(projectsByKey);
  const runList = Object.values(runsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);
  useEffect(() => {
    if (!project) { void fetchProject(handle, projectName); }
  }, [fetchProject, handle, project, projectName]);
  const projectRuns = project ? runList.filter((run) => run.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const showProjectNotFound = !project && !isProjectsLoading;
  const tabs = [
    { id: "runs", label: "Runs", href: `/${handle}/${projectName}` },
    { id: "compare", label: "Compare", href: `/${handle}/${projectName}/compare` },
    { id: "settings", label: "Settings", href: `/${handle}/${projectName}/settings` }
  ];
  const ownerInitial = handle[0]?.toUpperCase() ?? "?";
  const ownerAvatarSrc = `${apiBase}/accounts/${encodeURIComponent(handle)}/avatar`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: projectName }]} tabs={tabs} activeTabId="runs" />

      <main className="mx-auto w-full max-w-6xl px-6 py-6 lg:px-8">
        <header className="mb-5">
          <h1 className="flex flex-wrap items-center gap-2.5 text-xl font-semibold">
            <div className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-[#d9ecec] text-xs font-semibold text-brand-accentStrong">
              {ownerInitial}
              <img
                className="absolute inset-0 h-full w-full object-cover"
                src={ownerAvatarSrc}
                alt={`${handle} avatar`}
                onError={(event) => { event.currentTarget.style.display = "none"; }}
              />
            </div>
            <span className="text-brand-text">{projectName}</span>
            {project ? (
              <span
                className={"inline-flex items-center rounded-full border border-brand-border bg-brand-surface px-2 py-px"
                  + " text-[11px] leading-4 text-brand-textMuted"}
              >
                {project.visibility === "public" ? "Public" : "Private"}
              </span>
            ) : null}
          </h1>
        </header>
        {showProjectNotFound ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
        {project ? (
          <ProjectRunsTable
            runs={projectRuns}
            project={project}
            user={null}
            ownerHandle={handle}
            isLoading={isRunsLoading || isProjectsLoading}
            error={runError ?? projectError}
          />
        ) : null}
      </main>
    </div>
  );
}

export default function ProjectPage(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();

  return (
    <Switch>
      <Route path="/:handle/:projectName/runs/:runName" component={RunDetailPage} />
      <Route path="/:handle/:projectName/compare" component={ProjectComparePage} />
      <Route path="/:handle/:projectName/settings" component={ProjectSettingsPage} />
      <Route path="/:handle/:projectName" component={ProjectRunsContent} />
      <Route path="/:handle/:projectName/*"><Redirect to={`/${handle}/${projectName}`} /></Route>
    </Switch>
  );
}
