import { faCodeBranch, faGear, faList } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import Navbar from "components/Navbar";
import { buildProjectKey, useProjectStore } from "stores/projects";

export default function ProjectSettingsRoute(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const fetchProject = useProjectStore((state) => state.fetchProject);

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [fetchProjects, handle]);

  const projectList = Object.values(projectsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);

  useEffect(() => {
    if (!project) { void fetchProject(handle, projectName); }
  }, [fetchProject, handle, project, projectName]);
  const tabs = [
    { id: "runs", label: "Runs", href: `/${handle}/${projectName}`, icon: faList },
    { id: "compare", label: "Compare", href: `/${handle}/${projectName}/compare`, icon: faCodeBranch },
    { id: "settings", label: "Settings", href: `/${handle}/${projectName}/settings`, icon: faGear }
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar
        breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: projectName, href: `/${handle}/${projectName}` }, { label: "settings" }]}
        tabs={tabs}
        activeTabId="settings"
        tabsMaxWidth="100vw"
      />
      <main className="mx-auto w-full max-w-6xl px-6 py-6">
        {!project && !isProjectsLoading ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
        {project ? (
          <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 text-[14px] text-brand-textMuted shadow-soft">
            Project settings coming soon.
          </section>
        ) : null}
      </main>
    </div>
  );
}
