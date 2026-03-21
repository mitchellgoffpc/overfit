import { faCodeBranch, faGear, faList } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import Navbar from "components/Navbar";
import ProjectRunsTable from "components/ProjectRunsTable";
import { apiBase } from "helpers";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";

export default function ProjectRunsPage(): ReactElement {
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
    { id: "runs", label: "Runs", href: `/${handle}/${projectName}`, icon: faList },
    { id: "compare", label: "Compare", href: `/${handle}/${projectName}/compare`, icon: faCodeBranch },
    { id: "settings", label: "Settings", href: `/${handle}/${projectName}/settings`, icon: faGear }
  ];
  const ownerInitial = handle[0]?.toUpperCase() ?? "?";
  const ownerAvatarSrc = `${apiBase}/accounts/${encodeURIComponent(handle)}/avatar`;

  return (
    <div className="min-h-screen bg-[#e9efed] text-brand-text">
      <Navbar
        breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: projectName }]}
        tabs={tabs}
        activeTabId="runs"
        tabsMaxWidth="100vw"
      />

      <main
        className={[
          "relative mx-auto w-full overflow-hidden border-x border-b border-[#c4d1d1]",
          "bg-[#f8fcfa] shadow-[0_14px_36px_rgba(30,52,52,0.18)]"
        ].join(" ")}
        style={{ maxWidth: "calc(100% - 80px)" }}
      >
        <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[14px] bg-[#dce7e4]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.2) 1px, transparent 1px)", backgroundSize: "100% 30px" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-10 top-0 z-[100] w-px bg-[#efb1b1]/70" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-[292px] top-0 w-px bg-[#d4dfdf]" aria-hidden />

        <div className="relative py-5 pl-[66px] pr-5">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
              <h1 className="mt-1 flex flex-wrap items-center gap-2.5 font-display text-[34px] leading-none text-brand-text">
                <div
                  className={[
                    "relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-[#c3d7d7]",
                    "bg-[#d9ecec] text-xs font-semibold text-brand-accentStrong"
                  ].join(" ")}
                >
                  {ownerInitial}
                  <img
                    className="absolute inset-0 h-full w-full object-cover"
                    src={ownerAvatarSrc}
                    alt={`${handle} avatar`}
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                </div>
                <span>{projectName}</span>
              </h1>
            </div>
            {project ? (
              <span
                className={"inline-flex items-center rounded-full border border-[#d4dfdf] bg-white/90 px-2 py-px"
                  + " text-[11px] leading-4 text-brand-textMuted"}
              >
                {project.visibility === "public" ? "Public ledger" : "Private ledger"}
              </span>
            ) : null}
          </header>

          {showProjectNotFound ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
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
      </main>
    </div>
  );
}
