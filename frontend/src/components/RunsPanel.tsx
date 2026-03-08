import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";

import QuickstartGuide from "components/QuickstartGuide";

interface RunsPanelProps {
  readonly runs: Run[];
  readonly projects: Project[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

const formatRunTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) { return "Unknown time"; }
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatStatus = (status: Run["status"]): string => status.replace(/^\w/, (char) => char.toUpperCase());
const statusClasses: Record<Run["status"], string> = {
  queued: "bg-[#f7e9d5] text-[#9a5c0b]",
  running: "bg-[#dff0f0] text-brand-accentStrong",
  finished: "bg-[#e1f2e7] text-[#1f6b3f]",
  failed: "bg-[#fee4e2] text-[#b42318]",
  canceled: "bg-[#eceff1] text-[#4a5560]",
};

export default function RunsPanel({ runs, projects, isLoading, error }: RunsPanelProps): ReactElement {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      {runs.length > 0 ? (
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl">Recent runs</h2>
            <p className="mt-1.5 text-[13px] text-brand-textMuted">Latest activity across your projects.</p>
          </div>
          <div className="flex items-center">
            <div className="text-xs text-brand-textMuted">showing {runs.length}</div>
          </div>
        </div>
      ) : null}

      {error ? <div className="py-3 text-[13px] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[13px] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <QuickstartGuide />
        ) : (
          <div className="grid gap-2">
            {runs.map((run) => (
              <div className="flex items-center justify-between gap-3 rounded-[14px] border border-transparent bg-brand-surfaceMuted px-4 py-3 hover:border-brand-border" key={run.id}>
                <div className="grid gap-1.5">
                  <div className="font-semibold">{run.name}</div>
                  <div className="flex items-center gap-2 text-xs text-brand-textMuted">
                    <span>{projectNames.get(run.projectId) ?? "Unknown project"}</span>
                    <span className="text-brand-border">•</span>
                    <span>{formatRunTime(run.createdAt)}</span>
                  </div>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses[run.status]}`}>
                  {formatStatus(run.status)}
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
