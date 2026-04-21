import type { ReactElement } from "react";
import { useMemo } from "react";
import { Link } from "wouter";

import SectionHeader from "components/SectionHeader";
import { formatDate, RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import type { Project, Run } from "types";

const projectCardClass = "flex h-full flex-col justify-between rounded-[0.875rem] border border-brand-borderMuted bg-white/90 p-4 text-inherit"
  + " no-underline transition hover:border-brand-accent/40 hover:bg-hover-subtle";
const PROJECT_CARD_ROW_SPAN = 4;
const PROJECT_CARD_GRID_GAP_REM = RULED_LINE_HEIGHT * 0.5;
const PROJECT_CARD_HEIGHT = `${String(PROJECT_CARD_ROW_SPAN * RULED_LINE_HEIGHT - PROJECT_CARD_GRID_GAP_REM)}rem`;
const PROJECT_CARD_GRID_GAP = `${String(PROJECT_CARD_GRID_GAP_REM)}rem`;

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
      const latestRun = projectRuns.reduce<Run | null>((latest, run) => (latest && latest.createdAt > run.createdAt ? latest : run), null);
      return { project, runCount: projectRuns.length, latestRun };
    });
  }, [projects, runs]);

  return (
    <section>
      <SectionHeader title="Projects" subtitle={`${String(projects.length)} total`} sectionLabel="Section A" />

      {error ? <div className="py-2 text-[0.8125rem] text-brand-textMuted" style={{ marginTop: RULED_LINE }}>{error}</div> : null}
      {!error && isLoading ? <div className="py-2 text-[0.8125rem] text-brand-textMuted" style={{ marginTop: RULED_LINE }}>Loading projects...</div> : null}

      {!error && !isLoading ? (
        projects.length === 0 ? (
          <div
            className="truncate whitespace-nowrap px-4 text-[0.8125rem] text-brand-textMuted"
            style={{ marginTop: RULED_LINE, marginBottom: RULED_LINE, lineHeight: RULED_LINE }}
          >
            No projects to show.
          </div>
        ) : (
          <div
            className="grid md:grid-cols-2"
            style={{
              marginTop: `${String(.75 * RULED_LINE_HEIGHT)}rem`,
              marginBottom: `${String(0.25 * RULED_LINE_HEIGHT + PROJECT_CARD_GRID_GAP_REM)}rem`,
              gap: PROJECT_CARD_GRID_GAP,
            }}
          >
            {projectStats.map(({ project, runCount, latestRun }) => (
              <Link className={projectCardClass} href={`/${userHandle}/${project.name}`} key={project.id} style={{ height: PROJECT_CARD_HEIGHT }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-brand-text">{project.name}</span>
                  </div>
                  <span className="rounded-full border border-pill-border bg-pill-bg px-2 py-0.5 text-[0.6875rem] text-brand-accentStrong">Public</span>
                </div>
                <p className="truncate text-[0.75rem] text-brand-textMuted">{project.description ?? "No description yet."}</p>
                <div className="flex items-center gap-2 pt-1 text-[0.75rem] text-brand-textMuted">
                  <span>{String(runCount)} runs</span>
                  <span aria-hidden="true">•</span>
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
