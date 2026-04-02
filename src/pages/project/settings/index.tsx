import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faGear, faUsers } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { Redirect, Route, Switch, useLocation, useParams } from "wouter";

import NotebookShell from "components/NotebookShell";
import SidebarTabs from "components/SidebarTabs";
import type { SidebarTab } from "components/SidebarTabs";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import CollaboratorsSettings from "pages/project/settings/collaborators";
import GeneralSettings from "pages/project/settings/general";
import { buildProjectKey, useProjectStore } from "stores/projects";

const sidebarTabs: { id: string; label: string; path: string; icon: IconDefinition }[] = [
  { id: "general", label: "General", path: "general", icon: faGear },
  { id: "collaborators", label: "Collaborators", path: "collaborators", icon: faUsers },
];

export default function ProjectSettingsRoute(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projects = useProjectStore((state) => state.projects);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const [location] = useLocation();

  const projectList = Object.values(projects);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projects[projectKey] ?? projectList.find((item) => item.name === projectName);

  const basePath = `/${handle}/${projectName}/settings`;
  const tabs: SidebarTab[] = sidebarTabs.map((tab) => ({ id: tab.id, label: tab.label, href: `${basePath}/${tab.path}`, icon: tab.icon }));
  const activeTabId = tabs.find((tab) => location === tab.href || location.startsWith(`${tab.href}/`))?.id ?? "general";

  return (
    <NotebookShell columns="18.75rem 1fr" className="max-w-7xl">
      <aside className="relative pb-5 px-4 lg:border-r lg:pb-6 lg:pr-5" style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Lab Notebook</p>
        <h1 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Project Settings</h1>
        <p className="mt-2 font-mono text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{handle}/{projectName}</p>

        <SidebarTabs tabs={tabs} activeTabId={activeTabId} />
      </aside>

      <main className="relative min-w-0 pb-6 px-4 lg:px-6 lg:pb-6">
        {!project && !isProjectsLoading ? (
          <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{projectError ?? "Project not found."}</div>
        ) : null}
        {project ? (
          <div className="min-w-0">
            <Switch>
              <Route path="/:handle/:projectName/settings/general"><GeneralSettings project={project} /></Route>
              <Route path="/:handle/:projectName/settings/collaborators"><CollaboratorsSettings project={project} /></Route>
              <Route path="/:handle/:projectName/settings"><Redirect to={`${basePath}/general`} /></Route>
              <Route path="/:handle/:projectName/settings/*"><Redirect to={`${basePath}/general`} /></Route>
            </Switch>
          </div>
        ) : null}
      </main>
    </NotebookShell>
  );
}
