import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";
import { useMemo } from "react";

interface ProfileProjectsPanelProps {
  readonly projects: Project[];
  readonly runs: Run[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) { return "Unknown"; }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function ProfileProjectsPanel({ projects, runs, isLoading, error }: ProfileProjectsPanelProps): ReactElement {
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
    <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl">Projects</h2>
          <p className="mt-1.5 text-[13px] text-brand-textMuted">Experiment workspaces and latest activity.</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-brand-textMuted">
          <span>showing {projects.length}</span>
        </div>
      </div>

      {error ? <div className="py-3 text-[13px] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[13px] text-brand-textMuted">Loading projects...</div> : null}

      {!error && !isLoading ? (
        projects.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-brand-border bg-brand-surfaceMuted px-4 py-6 text-[13px] text-brand-textMuted">
            No projects yet. Start your first run to create a project.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {projectStats.map(({ project, runCount, latestRun }) => (
              <div className="grid gap-3 rounded-[16px] border border-brand-border bg-brand-surfaceMuted p-4" key={project.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="mt-1 text-xs text-brand-textMuted">{project.description ?? "No description yet."}</p>
                  </div>
                  <span className="rounded-full bg-[#e1f2f2] px-3 py-1 text-xs text-brand-accentStrong">Active</span>
                </div>
                <div className="flex items-center justify-between text-xs text-brand-textMuted">
                  <span>{runCount} runs</span>
                  <span>{latestRun ? `Last run ${formatDate(latestRun.createdAt)}` : "No runs yet"}</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
