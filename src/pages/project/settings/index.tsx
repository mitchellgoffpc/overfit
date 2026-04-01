import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faGear, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { Link, Redirect, Route, Switch, useLocation, useParams } from "wouter";

import NotebookShell from "components/NotebookShell";
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
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const [location] = useLocation();

  const projectList = Object.values(projectsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);

  const basePath = `/${handle}/${projectName}/settings`;
  const activeTabId = location.endsWith("/collaborators") ? "collaborators" : "general";

  return (
    <NotebookShell columns="18.75rem 1fr" className="max-w-7xl">
      <aside className="relative pb-5 px-4 lg:border-r lg:pb-6 lg:pr-5" style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Lab Notebook</p>
        <h1 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Project Settings</h1>
        <p className="mt-2 font-mono text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{handle}/{projectName}</p>

        <nav className="mt-7 grid gap-2">
          {sidebarTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <Link
                key={tab.id}
                href={`${basePath}/${tab.path}`}
                className={"flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[0.8125rem] no-underline transition"
                  + (isActive
                    ? " border-brand-accent bg-brand-accentMuted font-semibold text-brand-accent"
                    : " border-brand-borderMuted bg-white text-brand-textMuted hover:border-brand-borderStrong hover:text-brand-text")}
              >
                <FontAwesomeIcon icon={tab.icon} className="h-3.5 w-3.5" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
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
