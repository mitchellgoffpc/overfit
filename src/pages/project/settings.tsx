import type { ReactElement } from "react";
import { useParams } from "wouter";

import { buildProjectKey, useProjectStore } from "stores/projects";

export default function ProjectSettingsRoute(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);

  const projectList = Object.values(projectsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-6">
      {!project && !isProjectsLoading ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
      {project ? (
        <section className="rounded-[1.125rem] border border-brand-border bg-brand-surface p-5 text-[0.875rem] text-brand-textMuted shadow-soft">
          Project settings coming soon.
        </section>
      ) : null}
    </main>
  );
}
