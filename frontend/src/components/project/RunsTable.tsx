import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

import RunStatusBadge from "components/RunStatusBadge";
import { formatDuration, formatRunTime } from "helpers";

const runColors = ["#1a7b7d", "#e16367", "#5f86d5", "#a06ac9", "#d48834", "#2f9f77", "#ca5d94", "#61738a"];
const headerCellClass = "flex h-[1.875rem] items-center whitespace-nowrap px-2.5 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted";
const bodyCellClass = "flex h-[1.875rem] items-center whitespace-nowrap px-2.5 text-[0.75rem] text-brand-text";
const leftGridTemplateColumns = "0.5rem 3.5rem 11.25rem";
const leftPaneWidth = "15.25rem";

const formatRunConfigValue = (config: Run["config"], key: string): string => {
  if (!config || typeof config !== "object") { return "—"; }
  const value = key.split("/").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) { return undefined; }
    return (current as Record<string, unknown>)[segment];
  }, config);
  if (value === null || value === undefined) { return "—"; }
  if (typeof value === "number") {
    const fixed = Number.isInteger(value) ? String(value) : value.toFixed(4);
    return fixed.replace(/\.0+$/, "").replace(/\.$/, "");
  }
  if (typeof value === "string" || typeof value === "boolean") { return String(value); }
  return "—";
};

const getRunConfigKeys = (config: Run["config"]): string[] => {
  if (!config || typeof config !== "object" || Array.isArray(config)) { return []; }
  const keys: string[] = [];
  const visit = (value: Record<string, unknown>, prefix: string): void => {
    for (const [key, item] of Object.entries(value)) {
      const path = prefix ? `${prefix}/${key}` : key;
      if (item && typeof item === "object" && !Array.isArray(item)) {
        visit(item as Record<string, unknown>, path);
      } else {
        keys.push(path);
      }
    }
  };
  visit(config, "");
  return keys;
};

interface ProjectRunsTableProps {
  readonly runs: Run[];
  readonly project: Project;
  readonly ownerHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function ProjectRunsTable({ runs, project, ownerHandle, isLoading, error }: ProjectRunsTableProps): ReactElement {
  const [hoveredRunId, setHoveredRunId] = useState<string | null>(null);
  const colorByRunName = useMemo(() => new Map(runs.map((run, index) => [run.name, runColors[index % runColors.length] ?? "#1a7b7d"])), [runs]);
  const configColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const run of runs) {
      for (const key of getRunConfigKeys(run.config)) { keys.add(key); }
    }
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [runs]);
  const statusCounts = useMemo(() => {
    const counts: Record<Run["status"], number> = { queued: 0, running: 0, finished: 0, failed: 0, cancelled: 0 };
    for (const run of runs) { counts[run.status] += 1; }
    return counts;
  }, [runs]);
  const rightGridTemplateColumns = useMemo(
    () => ["7.5rem", "6.25rem", "9.375rem", "5.625rem", ...configColumns.map(() => "7.5rem")].join(" "),
    [configColumns]
  );
  const tableHeight = (runs.length + 1) * 1.875;
  const sectionHeight = Math.max(15, 9.375 + tableHeight + 0.75);

  return (
    <section style={{ minHeight: `${sectionHeight.toString()}rem` }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">Section A</p>
          <h2 className="text-[0.9375rem] font-semibold text-brand-text">Run Ledger</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">
          <span>{runs.length} entries</span>
          <span>{statusCounts.running} running</span>
          <span>{statusCounts.failed} failed</span>
          <span>{project.visibility}</span>
        </div>
      </div>

      {error ? <div className="absolute inset-x-0 top-[11.25rem] py-2 text-[0.8125rem] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="absolute inset-x-0 top-[11.25rem] py-2 text-[0.8125rem] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="absolute inset-x-0 top-[11.25rem] bg-white/20 px-4 py-8 text-[0.8125rem] text-brand-textMuted">
            No runs yet for {project.name}.
          </div>
        ) : (
          <div
            className="absolute -right-5 bottom-0 left-12 top-[11.25rem] grid min-w-0"
            style={{ gridTemplateColumns: `${leftPaneWidth} minmax(0, 1fr)` }}
          >
            <div>
              <div className="grid" style={{ gridTemplateColumns: leftGridTemplateColumns }}>
                <span />
                <span className={headerCellClass}>Ln</span>
                <span className={headerCellClass}>Name</span>
              </div>

              {runs.map((run, index) => {
                const runColor = colorByRunName.get(run.name) ?? runColors[index % runColors.length] ?? "#1a7b7d";
                const hovered = hoveredRunId === run.id;
                return (
                  <div
                    className={`grid h-[1.875rem] items-center -ml-12 pl-12 ${hovered ? "bg-brand-accent/5" : ""}`}
                    key={run.id}
                    style={{ gridTemplateColumns: leftGridTemplateColumns }}
                    onMouseEnter={() => { setHoveredRunId(run.id); }}
                    onMouseLeave={() => { setHoveredRunId(null); }}
                  >
                    <span />
                    <span className={`${bodyCellClass} font-mono text-[0.625rem] text-brand-textMuted`}>{String(index + 1).padStart(3, "0")}</span>
                    <Link className={`${bodyCellClass} min-w-0 gap-2 no-underline`} href={`/${ownerHandle}/${project.name}/runs/${run.name}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: runColor }} />
                      <span className="truncate font-semibold text-brand-text">{run.name}</span>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="min-w-0 self-stretch overflow-x-auto overflow-y-hidden">
              <div
                className="min-w-full w-max min-h-full pl-2"
              >
                <div className="grid" style={{ gridTemplateColumns: rightGridTemplateColumns }}>
                  <span className={headerCellClass}>State</span>
                  <span className={headerCellClass}>User</span>
                  <span className={headerCellClass}>Created</span>
                  <span className={headerCellClass}>Runtime</span>
                  {configColumns.map((column) => (
                    <span className={headerCellClass} key={column}>{column}</span>
                  ))}
                </div>

                {runs.map((run) => (
                  <div
                    className={`grid h-[1.875rem] items-center -ml-2 pl-2 ${hoveredRunId === run.id ? "bg-brand-accent/5" : ""}`}
                    key={run.id}
                    style={{ gridTemplateColumns: rightGridTemplateColumns }}
                    onMouseEnter={() => { setHoveredRunId(run.id); }}
                    onMouseLeave={() => { setHoveredRunId(null); }}
                  >
                    <div className={bodyCellClass}><RunStatusBadge status={run.status} /></div>
                    <span className={bodyCellClass}>@{run.user}</span>
                    <span className={bodyCellClass}>{formatRunTime(run.createdAt)}</span>
                    <span className={bodyCellClass}>{formatDuration(run.createdAt, run.updatedAt)}</span>
                    {configColumns.map((column) => (
                      <span className={`${bodyCellClass} max-w-[11.25rem] truncate`} key={column} title={formatRunConfigValue(run.config, column)}>
                        {formatRunConfigValue(run.config, column)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
