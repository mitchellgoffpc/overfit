import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";

import QuickstartGuide from "components/QuickstartGuide";
import RunStatusBadge from "components/RunStatusBadge";
import { buildProjectNameMap, formatRunTime } from "helpers";

const runItemClass = "flex items-center justify-between gap-3 rounded-[0.875rem] border border-transparent"
  + " bg-white/80 px-4 py-3 hover:border-[#c7d8d7] hover:bg-white";

interface RunsPanelProps {
  readonly runs: Run[];
  readonly projects: Project[];
  readonly userHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function RunsPanel({ runs, projects, userHandle, isLoading, error }: RunsPanelProps): ReactElement {
  const projectNames = buildProjectNameMap(projects);

  return (
    <section className="rounded-[0.875rem] border border-[#cfdddd] bg-[#f9fcfb]/70 p-4">
      {runs.length > 0 ? (
        <div className="mb-4 flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Section I</p>
            <h2 className="mt-1 font-display text-[2rem] leading-none">Recent Runs</h2>
            <p className="mt-1.5 text-[0.8125rem] text-brand-textMuted">Latest activity across your projects.</p>
          </div>
          <div className="flex items-center">
            <div className="rounded-full border border-[#cfdddd] bg-white/90 px-3 py-1 text-[0.75rem] text-brand-textMuted">
              showing {runs.length}
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <QuickstartGuide />
        ) : (
          <div className="grid gap-2">
            {runs.map((run) => (
              <a
                className={runItemClass}
                key={run.id}
                href={`/${userHandle}/${projectNames.get(run.projectId) ?? "project"}/runs/${run.name}`}
              >
                <div className="grid gap-1.5">
                  <div className="text-[0.875rem] font-semibold">{run.name}</div>
                  <div className="flex items-center gap-2 text-xs text-brand-textMuted">
                    <span>{projectNames.get(run.projectId) ?? "Unknown project"}</span>
                    <span className="text-brand-border">•</span>
                    <span>{formatRunTime(run.createdAt)}</span>
                  </div>
                </div>
                <RunStatusBadge status={run.status} />
              </a>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
