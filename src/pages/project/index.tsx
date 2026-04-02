import { faCodeBranch, faGear, faList } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { Redirect, Route, Switch, useLocation, useParams } from "wouter";

import Navbar from "components/Navbar";
import ProjectComparePage from "pages/project/compare";
import ProjectRunsPage from "pages/project/runs";
import ProjectSettingsPage from "pages/project/settings/index";
import { buildProjectKey, fetchProject, fetchProjects, useProjectStore } from "stores/projects";

export default function ProjectPage(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projects = useProjectStore((state) => state.projects);

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [handle]);

  const projectKey = buildProjectKey(handle, projectName);
  const project = projects[projectKey] ?? Object.values(projects).find((item) => item.name === projectName);

  useEffect(() => {
    if (!project) { void fetchProject(handle, projectName); }
  }, [handle, project, projectName]);

  const [location] = useLocation();
  const activeTab = location.endsWith("/compare") ? "compare" : location.includes("/settings") ? "settings" : "runs";
  const basePath = `/${handle}/${projectName}`;
  const tabs = [
    { id: "runs", label: "Runs", href: basePath, icon: faList },
    { id: "compare", label: "Compare", href: `${basePath}/compare`, icon: faCodeBranch },
    { id: "settings", label: "Settings", href: `${basePath}/settings`, icon: faGear }
  ];
  const breadcrumbs = activeTab === "runs"
    ? [{ label: handle, href: `/${handle}` }, { label: projectName }]
    : [{ label: handle, href: `/${handle}` }, { label: projectName, href: basePath }, { label: activeTab }];

  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar
        breadcrumbs={breadcrumbs}
        tabs={tabs}
        activeTabId={activeTab}
        {...(activeTab === "settings" ? { pageWidth: "80rem" } : {})}
      />

      <Switch>
        <Route path="/:handle/:projectName/compare" component={ProjectComparePage} />
        <Route path="/:handle/:projectName/settings/*" component={ProjectSettingsPage} />
        <Route path="/:handle/:projectName/settings" component={ProjectSettingsPage} />
        <Route path="/:handle/:projectName" component={ProjectRunsPage} />
        <Route path="/:handle/:projectName/*"><Redirect to={basePath} /></Route>
      </Switch>
    </div>
  );
}
