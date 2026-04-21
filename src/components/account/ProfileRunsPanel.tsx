import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

import { getRunColor } from "colors";
import RunStatusBadge from "components/RunStatusBadge";
import SectionHeader from "components/SectionHeader";
import { formatDuration, formatRunTime, getRunStatus, RULED_LINE, TABLE_BODY_CELL_CLASS, TABLE_HEADER_CELL_CLASS } from "helpers";
import type { Project, Run } from "types";

const tableGridTemplateColumns = "3.5rem 14rem 7.5rem 8.5rem 9.25rem 5.625rem";

interface ProfileRunsPanelProps {
  readonly runs: Run[];
  readonly projects: Project[];
  readonly userHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function ProfileRunsPanel({ runs, projects, userHandle, isLoading, error }: ProfileRunsPanelProps): ReactElement {
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const colorByRunId = useMemo(() => new Map(runs.map((run, index) => [run.id, getRunColor(index)])), [runs]);

  return (
    <section className="min-w-0">
      <SectionHeader title="Runs" subtitle={`${String(runs.length)} total`} sectionLabel="Section B" />

      {error ? <div className="py-2 text-[0.8125rem] text-brand-textMuted" style={{ marginTop: RULED_LINE }}>{error}</div> : null}
      {!error && isLoading ? <div className="py-2 text-[0.8125rem] text-brand-textMuted" style={{ marginTop: RULED_LINE }}>Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div
            className="truncate whitespace-nowrap px-4 text-[0.8125rem] text-brand-textMuted"
            style={{ marginTop: RULED_LINE, marginBottom: RULED_LINE, lineHeight: RULED_LINE }}
          >
            No runs to show.
          </div>
        ) : (
          <div className="-mx-4 min-w-0 overflow-x-auto overflow-y-hidden lg:-mx-5" style={{ marginTop: RULED_LINE }}>
            <div className="w-max min-w-max">
              <div className="grid px-4 lg:px-5" style={{ gridTemplateColumns: tableGridTemplateColumns, height: RULED_LINE }}>
                <span className={TABLE_HEADER_CELL_CLASS}>Ln</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Name</span>
                <span className={TABLE_HEADER_CELL_CLASS}>State</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Project</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Started</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Runtime</span>
              </div>

              {runs.map((run, index) => {
                const runColor = colorByRunId.get(run.id) ?? getRunColor(index);
                const projectName = projectNames.get(run.projectId) ?? run.projectName;
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
                    <Link className={`${TABLE_BODY_CELL_CLASS} min-w-0 gap-2 no-underline`} href={`/${userHandle}/${projectName}/runs/${run.name}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: runColor }} />
                      <span className="truncate font-semibold text-brand-text">{run.name}</span>
                    </Link>
                    <div className={TABLE_BODY_CELL_CLASS}><RunStatusBadge status={getRunStatus(run)} /></div>
                    <span className={TABLE_BODY_CELL_CLASS}>{projectName}</span>
                    <span className={TABLE_BODY_CELL_CLASS}>{formatRunTime(run.createdAt)}</span>
                    <span className={TABLE_BODY_CELL_CLASS}>{formatDuration(run.createdAt, run.updatedAt)}</span>
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
