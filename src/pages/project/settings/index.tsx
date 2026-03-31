import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faGear, faUsers } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { Link, Redirect, Route, Switch, useLocation, useParams } from "wouter";

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
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      {!project && !isProjectsLoading ? (
        <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{projectError ?? "Project not found."}</div>
      ) : null}
      {project ? (
        <div className="flex gap-8">
          <aside className="w-52 shrink-0">
            <nav className="sticky top-8 grid gap-0.5">
              {sidebarTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <Link
                    key={tab.id}
                    href={`${basePath}/${tab.path}`}
                    className={"flex items-center gap-2.5 rounded-lg px-3 py-2 text-[0.8125rem] no-underline transition"
                      + (isActive
                        ? " bg-brand-accent/10 font-semibold text-brand-accent"
                        : " text-brand-textMuted hover:bg-hover-subtle hover:text-brand-text")}
                  >
                    <FontAwesomeIcon icon={tab.icon} className="h-3.5 w-3.5" />
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <Switch>
              <Route path="/:handle/:projectName/settings/general"><GeneralSettings project={project} /></Route>
              <Route path="/:handle/:projectName/settings/collaborators"><CollaboratorsSettings project={project} /></Route>
              <Route path="/:handle/:projectName/settings"><Redirect to={`${basePath}/general`} /></Route>
              <Route path="/:handle/:projectName/settings/*"><Redirect to={`${basePath}/general`} /></Route>
            </Switch>
          </div>
        </div>
      ) : null}
    </main>
  );
}
