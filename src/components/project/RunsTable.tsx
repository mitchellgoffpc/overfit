import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

import { getRunColor } from "colors";
import RunStatusBadge from "components/RunStatusBadge";
import { formatDuration, formatRunTime, RULED_LINE, RULED_LINE_HEIGHT, TABLE_BODY_CELL_CLASS, TABLE_HEADER_CELL_CLASS } from "helpers";
import type { Project, Run } from "types";

const leftHeaderIndexCellClass = "flex items-center whitespace-nowrap pr-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted";
const leftBodyIndexCellClass = "flex items-center whitespace-nowrap pr-2 font-mono text-[0.625rem] text-brand-textMuted";
const leftGridTemplateColumns = "2.5rem minmax(0, 1fr)";
const leftPaneWidth = "14.75rem";

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
  const colorByRunName = useMemo(() => new Map(runs.map((run, index) => [run.name, getRunColor(index)])), [runs]);
  const configColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const run of runs) {
      for (const key of getRunConfigKeys(run.config)) { keys.add(key); }
    }
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [runs]);
  const rightGridTemplateColumns = useMemo(
    () => ["7.5rem", "6.25rem", "9.375rem", "5.625rem", ...configColumns.map(() => "7.5rem")].join(" "),
    [configColumns]
  );
  const tableHeight = (runs.length + 1) * RULED_LINE_HEIGHT;
  const sectionHeight = Math.max(15, 9.375 + tableHeight + 0.75);

  return (
    <section style={{ minHeight: `${sectionHeight.toString()}rem` }}>
      {error ? <div className="mt-4 py-2 text-[0.8125rem] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="mt-4 py-2 text-[0.8125rem] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="mt-4 bg-white/20 px-4 py-8 text-[0.8125rem] text-brand-textMuted">
            No runs yet for {project.name}.
          </div>
        ) : (
          <div className="mt-4 -mr-5 grid min-w-0" style={{ gridTemplateColumns: `${leftPaneWidth} minmax(0, 1fr)` }}>
            <div>
              <div className="grid" style={{ gridTemplateColumns: leftGridTemplateColumns, height: RULED_LINE }}>
                <span className={leftHeaderIndexCellClass}>Ln</span>
                <span className={TABLE_HEADER_CELL_CLASS}>Name</span>
              </div>

              {runs.map((run, index) => {
                const runColor = colorByRunName.get(run.name) ?? getRunColor(index);
                const hovered = hoveredRunId === run.id;
                return (
                  <div
                    className={`grid items-center -ml-14 w-[calc(100%+3.5rem)] pl-14 ${hovered ? "bg-brand-accent/5" : ""}`}
                    key={run.id}
                    style={{ gridTemplateColumns: leftGridTemplateColumns, height: RULED_LINE }}
                    onMouseEnter={() => { setHoveredRunId(run.id); }}
                    onMouseLeave={() => { setHoveredRunId(null); }}
                  >
                    <span className={leftBodyIndexCellClass}>{String(index + 1).padStart(3, "0")}</span>
                    <Link className={`${TABLE_BODY_CELL_CLASS} min-w-0 gap-2 no-underline`} href={`/${ownerHandle}/${project.name}/runs/${run.name}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: runColor }} />
                      <span className="truncate font-semibold text-brand-text">{run.name}</span>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="min-w-0 self-stretch overflow-x-auto overflow-y-hidden">
              <div className="min-h-full min-w-full w-max">
                <div className="grid pl-2" style={{ gridTemplateColumns: rightGridTemplateColumns, height: RULED_LINE }}>
                  <span className={TABLE_HEADER_CELL_CLASS}>State</span>
                  <span className={TABLE_HEADER_CELL_CLASS}>User</span>
                  <span className={TABLE_HEADER_CELL_CLASS}>Created</span>
                  <span className={TABLE_HEADER_CELL_CLASS}>Runtime</span>
                  {configColumns.map((column) => (
                    <span className={TABLE_HEADER_CELL_CLASS} key={column}>{column}</span>
                  ))}
                </div>

                {runs.map((run) => (
                  <div
                    className={`grid items-center pl-2 ${hoveredRunId === run.id ? "bg-brand-accent/5" : ""}`}
                    key={run.id}
                    style={{ gridTemplateColumns: rightGridTemplateColumns, height: RULED_LINE }}
                    onMouseEnter={() => { setHoveredRunId(run.id); }}
                    onMouseLeave={() => { setHoveredRunId(null); }}
                  >
                    <div className={TABLE_BODY_CELL_CLASS}><RunStatusBadge status={run.status} /></div>
                    <span className={TABLE_BODY_CELL_CLASS}>@{run.user}</span>
                    <span className={TABLE_BODY_CELL_CLASS}>{formatRunTime(run.createdAt)}</span>
                    <span className={TABLE_BODY_CELL_CLASS}>{formatDuration(run.createdAt, run.updatedAt)}</span>
                    {configColumns.map((column) => (
                      <span className={`${TABLE_BODY_CELL_CLASS} max-w-[11.25rem] truncate`} key={column} title={formatRunConfigValue(run.config, column)}>
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
