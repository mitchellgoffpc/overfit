import type { Project, Run, User } from "@underfit/types";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { Link } from "wouter";

import RunStatusBadge from "components/RunStatusBadge";
import { formatDuration, formatRunConfigValue, formatRunTime } from "helpers";

const runColors = ["#1a7b7d", "#e16367", "#5f86d5", "#a06ac9", "#d48834", "#2f9f77", "#ca5d94", "#61738a"];
const tableGridCols = "grid-cols-[260px_132px_120px_120px_120px_140px_110px_80px_90px_90px_100px_100px_90px]";
const headerCellClass = "border-b border-brand-border px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-brand-textMuted";
const bodyCellClass = "px-3 py-2 text-[13px]";
const stickyBaseClass = `${bodyCellClass} sticky left-0 z-10 flex min-w-0 items-center gap-2.5 border-r border-brand-border bg-brand-surface`;
const stickyNameCellClass = `${stickyBaseClass} no-underline transition`
  + " group-hover:bg-[#f5f9f9]";

interface ProjectRunsTableProps {
  readonly runs: Run[];
  readonly project: Project;
  readonly user: User | null;
  readonly ownerHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function ProjectRunsTable({ runs, project, user, ownerHandle, isLoading, error }: ProjectRunsTableProps): ReactElement {
  const colorByRunName = useMemo(() => new Map(runs.map((run, index) => [run.name, runColors[index % runColors.length] ?? "#1a7b7d"])), [runs]);

  return (
    <section className="w-full">
      {error ? <div className="py-3 text-[13px] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[13px] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="py-3 text-[13px] text-brand-textMuted">No runs yet for {project.name}.</div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-brand-border bg-brand-surface shadow-soft">
            <div className="min-w-[1440px]">
              <div className={`grid ${tableGridCols} items-center`}>
                <span className={`${headerCellClass} sticky left-0 z-20 border-r bg-brand-surface`}>Name</span>
                <span className={headerCellClass}>State</span>
                <span className={headerCellClass}>Notes</span>
                <span className={headerCellClass}>User</span>
                <span className={headerCellClass}>Tags</span>
                <span className={headerCellClass}>Created</span>
                <span className={headerCellClass}>Runtime</span>
                <span className={headerCellClass}>Sweep</span>
                <span className={headerCellClass}>Batch</span>
                <span className={headerCellClass}>D FF</span>
                <span className={headerCellClass}>D Model</span>
                <span className={headerCellClass}>Device</span>
                <span className={headerCellClass}>Dropout</span>
              </div>
              {runs.map((run, index) => {
                const runColor = colorByRunName.get(run.name) ?? runColors[index % runColors.length] ?? "#1a7b7d";
                return (
                  <div className={`group grid ${tableGridCols} items-center border-b border-brand-border/70 last:border-b-0`} key={run.id}>
                    <Link
                      className={stickyNameCellClass}
                      href={`/${ownerHandle}/${project.name}/runs/${run.name}`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: runColor }} />
                      <p className="truncate font-semibold text-brand-text">{run.name}</p>
                    </Link>
                    <div className={bodyCellClass}><RunStatusBadge status={run.status} /></div>
                    <span className={`${bodyCellClass} text-brand-textMuted`}>—</span>
                    <span className={bodyCellClass}>{user?.handle ?? run.user}</span>
                    <span className={`${bodyCellClass} text-brand-textMuted`}>—</span>
                    <span className={bodyCellClass}>{formatRunTime(run.createdAt)}</span>
                    <span className={bodyCellClass}>{formatDuration(run.createdAt, run.updatedAt)}</span>
                    <span className={`${bodyCellClass} text-brand-textMuted`}>—</span>
                    <span className={bodyCellClass}>{formatRunConfigValue(run.config, "batch_size")}</span>
                    <span className={bodyCellClass}>{formatRunConfigValue(run.config, "d_ff")}</span>
                    <span className={bodyCellClass}>{formatRunConfigValue(run.config, "d_model")}</span>
                    <span className={bodyCellClass}>{formatRunConfigValue(run.config, "device")}</span>
                    <span className={bodyCellClass}>{formatRunConfigValue(run.config, "dropout")}</span>
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
