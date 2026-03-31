import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

import { colors, runPalette } from "colors";
import RunStatusBadge from "components/RunStatusBadge";
import { formatDuration, formatRunTime, RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import type { Project, Run } from "types";

const headerCellClass = "flex items-center whitespace-nowrap px-2.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted";
const bodyCellClass = "flex items-center whitespace-nowrap px-2.5 text-[0.75rem] text-brand-text";
const tableGridTemplateColumns = "3.5rem 14rem 7.5rem 8.5rem 9.25rem 5.625rem 6.25rem";

interface WorkspaceRunsTableProps {
  readonly runs: Run[];
  readonly projects: Project[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function WorkspaceRunsTable({ runs, projects, isLoading, error }: WorkspaceRunsTableProps): ReactElement {
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const statusCounts = useMemo(() => {
    const counts: Record<Run["status"], number> = { queued: 0, running: 0, finished: 0, failed: 0, cancelled: 0 };
    for (const run of runs) { counts[run.status] += 1; }
    return counts;
  }, [runs]);
  const projectCount = projects.length;
  const colorByRunId = useMemo(() => new Map(runs.map((run, index) => [run.id, runPalette[index % runPalette.length] ?? colors.brand.accent])), [runs]);
  const tableHeight = (runs.length + 1) * RULED_LINE_HEIGHT;
  const sectionHeight = Math.max(15, 6.875 + tableHeight);

  return (
    <section style={{ minHeight: `${sectionHeight.toString()}rem` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">Section H</p>
          <h2 className="mt-1 font-display text-[2.125rem] leading-none text-brand-text">Workspace Run Ledger</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">
          <span>{runs.length} entries</span>
          <span>{statusCounts.running} running</span>
          <span>{statusCounts.failed} failed</span>
          <span>{projectCount} projects</span>
        </div>
      </div>

      {error ? <div className="mt-4 py-2 text-[0.8125rem] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="mt-4 py-2 text-[0.8125rem] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="mt-4 bg-white/20 px-4 py-8 text-[0.8125rem] text-brand-textMuted">
            No runs yet across your projects.
          </div>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overflow-y-hidden">
            <div className="min-w-full w-max">
              <div className="grid" style={{ gridTemplateColumns: tableGridTemplateColumns, height: RULED_LINE }}>
                <span className={headerCellClass}>Ln</span>
                <span className={headerCellClass}>Name</span>
                <span className={headerCellClass}>State</span>
                <span className={headerCellClass}>Project</span>
                <span className={headerCellClass}>Started</span>
                <span className={headerCellClass}>Runtime</span>
                <span className={headerCellClass}>User</span>
              </div>

              {runs.map((run, index) => {
                const runColor = colorByRunId.get(run.id) ?? runPalette[index % runPalette.length] ?? colors.brand.accent;
                const hovered = hoveredRunId === run.id;
                return (
                  <div
                    className={`grid items-center ${hovered ? "bg-brand-accent/5" : ""}`}
                    key={run.id}
                    style={{ gridTemplateColumns: tableGridTemplateColumns, height: RULED_LINE }}
                    onMouseEnter={() => { setHoveredRunId(run.id); }}
                    onMouseLeave={() => { setHoveredRunId(null); }}
                  >
                    <span className={`${bodyCellClass} font-mono text-[0.625rem] text-brand-textMuted`}>{String(index + 1).padStart(3, "0")}</span>
                    <Link className={`${bodyCellClass} min-w-0 gap-2 no-underline`} href={`/${run.projectOwner}/${run.projectName}/runs/${run.name}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: runColor }} />
                      <span className="truncate font-semibold text-brand-text">{run.name}</span>
                    </Link>
                    <div className={bodyCellClass}><RunStatusBadge status={run.status} /></div>
                    <span className={bodyCellClass}>{run.projectName}</span>
                    <span className={bodyCellClass}>{formatRunTime(run.createdAt)}</span>
                    <span className={bodyCellClass}>{formatDuration(run.createdAt, run.updatedAt)}</span>
                    <span className={bodyCellClass}>@{run.user}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
