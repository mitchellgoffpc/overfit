import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { Link } from "wouter";

import { formatDate } from "helpers";

const projectCardClass = "grid gap-3 rounded-[0.875rem] border border-[#d4dede] bg-white/85 p-4 text-inherit"
  + " no-underline transition hover:border-brand-accent/40 hover:bg-[#f1f8f8]";

interface ProfileProjectsPanelProps {
  readonly projects: Project[];
  readonly runs: Run[];
  readonly userHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function ProfileProjectsPanel({ projects, runs, userHandle, isLoading, error }: ProfileProjectsPanelProps): ReactElement {
  const projectStats = useMemo(() => {
    const runsByProject = new Map<string, Run[]>();
    runs.forEach((run) => {
      const list = runsByProject.get(run.projectId) ?? [];
      list.push(run);
      runsByProject.set(run.projectId, list);
    });

    return projects.map((project) => {
      const projectRuns = runsByProject.get(project.id) ?? [];
      const latestRun = projectRuns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return { project, runCount: projectRuns.length, latestRun };
    });
  }, [projects, runs]);

  return (
    <section className="rounded-[1.125rem] border border-[#d4dede] bg-[#f9fcfb]/90 p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand-textMuted">Section A</p>
          <h2 className="mt-1 text-xl">Projects</h2>
          <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Experiment workspaces and latest activity.</p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[0.6875rem] text-brand-textMuted">
          <span>showing {projects.length}</span>
        </div>
      </div>

      {error ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">Loading projects...</div> : null}

      {!error && !isLoading ? (
        projects.length === 0 ? (
          <div className="rounded-[0.875rem] border border-dashed border-[#cfd9d9] bg-white/75 px-4 py-6 text-[0.8125rem] text-brand-textMuted">
            No projects yet. Start your first run to create a project.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projectStats.map(({ project, runCount, latestRun }) => (
                <Link
                  className={projectCardClass}
                  href={`/${userHandle}/${project.name}`}
                  key={project.id}
                >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="mt-1 text-xs text-brand-textMuted">{project.description ?? "No description yet."}</p>
                  </div>
                  <span className="rounded-full border border-[#c8d6d6] bg-[#eef5f4] px-3 py-1 text-xs text-brand-accentStrong">Active</span>
                </div>
                <div className="flex items-center justify-between text-xs text-brand-textMuted">
                  <span>{runCount} runs</span>
                  <span>{latestRun ? `Last run ${formatDate(latestRun.createdAt)}` : "No runs yet"}</span>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
