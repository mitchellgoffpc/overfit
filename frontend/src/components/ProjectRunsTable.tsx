import type { Project, Run, User } from "@underfit/types";
import type { ReactElement } from "react";
import { useMemo } from "react";
import { Link } from "wouter";

import RunStatusBadge from "components/RunStatusBadge";
import { formatDuration, formatRunTime } from "helpers";

const runColors = ["#1a7b7d", "#e16367", "#5f86d5", "#a06ac9", "#d48834", "#2f9f77", "#ca5d94", "#61738a"];
const headerCellClass = "whitespace-nowrap px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-brand-textMuted";
const bodyCellClass = "whitespace-nowrap px-3 py-2 text-[13px]";
const rowCellClass = `${bodyCellClass} transition-colors group-hover:bg-[#f5f9f9]`;
const stickyBaseClass = `${bodyCellClass} sticky left-0 z-10 flex min-w-0 items-center gap-2.5 border-r border-brand-border bg-brand-surface`;
const stickyNameCellClass = `${stickyBaseClass} no-underline transition-colors group-hover:bg-[#f5f9f9]`;

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
  readonly user: User | null;
  readonly ownerHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function ProjectRunsTable({ runs, project, user, ownerHandle, isLoading, error }: ProjectRunsTableProps): ReactElement {
  const colorByRunName = useMemo(() => new Map(runs.map((run, index) => [run.name, runColors[index % runColors.length] ?? "#1a7b7d"])), [runs]);
  const configColumns = useMemo(() => {
    const keys = new Set<string>();
    for (const run of runs) {
      for (const key of getRunConfigKeys(run.config)) { keys.add(key); }
    }
    return [...keys].sort((a, b) => a.localeCompare(b));
  }, [runs]);
  const tableGridTemplateColumns = useMemo(() => (
    ["260px", "132px", "120px", "120px", "140px", "110px", ...configColumns.map(() => "120px")].join(" ")
  ), [configColumns]);

  return (
    <section className="w-full">
      {error ? <div className="py-3 text-[13px] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[13px] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="py-3 text-[13px] text-brand-textMuted">No runs yet for {project.name}.</div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-brand-border bg-brand-surface shadow-soft">
            <div className="min-w-full w-max">
              <div className="grid items-center border-b border-brand-border" style={{ gridTemplateColumns: tableGridTemplateColumns }}>
                <span className={`${headerCellClass} sticky left-0 z-20 border-r bg-brand-surface`}>Name</span>
                <span className={headerCellClass}>State</span>
                <span className={headerCellClass}>Notes</span>
                <span className={headerCellClass}>User</span>
                <span className={headerCellClass}>Created</span>
                <span className={headerCellClass}>Runtime</span>
                {configColumns.map((column) => <span className={headerCellClass} key={column}>{column}</span>)}
              </div>
              {runs.map((run, index) => {
                const runColor = colorByRunName.get(run.name) ?? runColors[index % runColors.length] ?? "#1a7b7d";
                return (
                  <div
                    className="group grid items-center border-b border-brand-border/70 last:border-b-0"
                    key={run.id}
                    style={{ gridTemplateColumns: tableGridTemplateColumns }}
                  >
                    <Link
                      className={stickyNameCellClass}
                      href={`/${ownerHandle}/${project.name}/runs/${run.name}`}
                    >
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: runColor }} />
                      <p className="truncate font-semibold text-brand-text">{run.name}</p>
                    </Link>
                    <div className={rowCellClass}><RunStatusBadge status={run.status} /></div>
                    <span className={`${rowCellClass} text-brand-textMuted`}>—</span>
                    <span className={rowCellClass}>{user?.handle ?? run.user}</span>
                    <span className={rowCellClass}>{formatRunTime(run.createdAt)}</span>
                    <span className={rowCellClass}>{formatDuration(run.createdAt, run.updatedAt)}</span>
                    {configColumns.map((column) => <span className={rowCellClass} key={column}>{formatRunConfigValue(run.config, column)}</span>)}
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
