import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";
import { Link } from "wouter";

import RunStatusBadge from "components/RunStatusBadge";
import { buildProjectNameMap, formatRunTime } from "helpers";

const runCardClass = "grid gap-3 rounded-[0.875rem] border border-brand-borderMuted bg-white/85 px-4 py-3 text-inherit"
  + " no-underline transition hover:border-brand-accent/40 hover:bg-hover md:grid-cols-[2fr_1.2fr_1fr_0.6fr]";

interface ProfileRunsPanelProps {
  readonly runs: Run[];
  readonly projects: Project[];
  readonly userHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function ProfileRunsPanel({ runs, projects, userHandle, isLoading, error }: ProfileRunsPanelProps): ReactElement {
  const projectNames = buildProjectNameMap(projects);

  return (
    <section className="rounded-[1.125rem] border border-brand-borderMuted bg-brand-surfaceTinted/90 p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand-textMuted">Section B</p>
          <h2 className="mt-1 text-xl">Runs</h2>
          <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Latest runs across all projects.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[0.6875rem] text-brand-textMuted">
          <span>showing {runs.length}</span>
        </div>
      </div>

      {error ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="rounded-[0.875rem] border border-dashed border-brand-borderMuted bg-white/75 px-4 py-6 text-[0.8125rem] text-brand-textMuted">
            No runs yet. Launch a run to populate your profile activity.
          </div>
        ) : (
          <div className="grid gap-2">
            {runs.map((run) => (
              <Link
                className={runCardClass}
                href={`/${userHandle}/${projectNames.get(run.projectId) ?? "project"}/runs/${run.name}`}
                key={run.id}
              >
                <div className="grid gap-1">
                  <span className="font-semibold">{run.name}</span>
                  <span className="text-xs text-brand-textMuted">{projectNames.get(run.projectId) ?? "Unknown project"}</span>
                </div>
                <span className="text-xs text-brand-textMuted">{formatRunTime(run.createdAt)}</span>
                <span className="text-xs text-brand-textMuted">@{userHandle}</span>
                <div className="flex justify-start md:justify-end">
                  <RunStatusBadge status={run.status} />
                </div>
              </Link>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
