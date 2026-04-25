import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

import { getRunColor } from "colors";
import RunStatusBadge from "components/RunStatusBadge";
import { formatDuration, formatRunTime, getRunStatus, RULED_LINE, RULED_LINE_HEIGHT, TABLE_BODY_CELL_CLASS, TABLE_HEADER_CELL_CLASS } from "helpers";
import type { Run } from "types";

const tableGridTemplateColumns = "3.5rem 14rem 7.5rem 8.5rem 9.25rem 5.625rem 6.25rem";

interface WorkspaceRunsTableProps {
  readonly runs: Run[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function WorkspaceRunsTable({ runs, isLoading, error }: WorkspaceRunsTableProps): ReactElement {
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const colorByRunId = useMemo(() => new Map(runs.map((run) => [run.id, getRunColor(run.id)])), [runs]);
  const tableHeight = (runs.length + 1) * RULED_LINE_HEIGHT;
  const sectionHeight = Math.max(15, 6.875 + tableHeight);

  return (
    <section style={{ minHeight: `${sectionHeight.toString()}rem` }}>
      {error ? <div className="py-2 text-[0.8125rem] text-brand-textMuted" style={{ marginTop: RULED_LINE }}>{error}</div> : null}
      {!error && isLoading ? <div className="py-2 text-[0.8125rem] text-brand-textMuted" style={{ marginTop: RULED_LINE }}>Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="bg-white/20 px-4 py-8 text-[0.8125rem] text-brand-textMuted" style={{ marginTop: RULED_LINE }}>
            No runs yet across your projects.
          </div>
        ) : (
          <div className="-mx-4 min-w-0 overflow-x-auto overflow-y-hidden lg:-mx-5" style={{ marginTop: RULED_LINE }}>
            <div className="min-w-full w-max">
              <div className="grid px-4 lg:px-5" style={{ gridTemplateColumns: tableGridTemplateColumns, height: RULED_LINE }}>
                <span className={TABLE_HEADER_CELL_CLASS}>Ln</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Name</span>
                <span className={TABLE_HEADER_CELL_CLASS}>State</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Project</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Started</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Runtime</span>
                <span className={TABLE_HEADER_CELL_CLASS}>User</span>
              </div>

              {runs.map((run, index) => {
                const runColor = colorByRunId.get(run.id) ?? getRunColor(run.id);
                const hovered = hoveredRunId === run.id;
                return (
                  <div
                    className={`grid items-center px-4 lg:px-5 ${hovered ? "bg-brand-accent/5" : ""}`}
                    key={run.id}
                    style={{ gridTemplateColumns: tableGridTemplateColumns, height: RULED_LINE }}
                    onMouseEnter={() => { setHoveredRunId(run.id); }}
                    onMouseLeave={() => { setHoveredRunId(null); }}
                  >
                    <span className={`${TABLE_BODY_CELL_CLASS} font-mono text-[0.625rem] text-brand-textMuted`}>{String(index + 1).padStart(3, "0")}</span>
                    <Link className={`${TABLE_BODY_CELL_CLASS} min-w-0 gap-2 no-underline`} href={`/${run.projectOwner}/${run.projectName}/runs/${run.name}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: runColor }} />
                      <span className="truncate font-semibold text-brand-text">{run.name}</span>
                    </Link>
                    <div className={TABLE_BODY_CELL_CLASS}><RunStatusBadge status={getRunStatus(run)} /></div>
                    <span className={TABLE_BODY_CELL_CLASS}>{run.projectName}</span>
                    <span className={TABLE_BODY_CELL_CLASS}>{formatRunTime(run.createdAt)}</span>
                    <span className={TABLE_BODY_CELL_CLASS}>{formatDuration(run.createdAt, run.updatedAt)}</span>
                    <span className={TABLE_BODY_CELL_CLASS}>@{run.user}</span>
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
