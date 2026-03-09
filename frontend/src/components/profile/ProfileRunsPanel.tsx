import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";

import RunStatusBadge from "components/RunStatusBadge";
import { buildProjectNameMap, formatRunTime } from "helpers";

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
    <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl">Runs</h2>
          <p className="mt-1.5 text-[13px] text-brand-textMuted">Latest runs across all projects.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-textMuted">
          <span>showing {runs.length}</span>
        </div>
      </div>

      {error ? <div className="py-3 text-[13px] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[13px] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-brand-border bg-brand-surfaceMuted px-4 py-6 text-[13px] text-brand-textMuted">
            No runs yet. Launch a run to populate your profile activity.
          </div>
        ) : (
          <div className="grid gap-2">
            {runs.map((run) => (
              <div className="grid gap-3 rounded-[14px] border border-transparent bg-brand-surfaceMuted px-4 py-3 md:grid-cols-[2fr_1.2fr_1fr_0.6fr]" key={run.id}>
                <div className="grid gap-1">
                  <span className="font-semibold">{run.name}</span>
                  <span className="text-xs text-brand-textMuted">{projectNames.get(run.projectId) ?? "Unknown project"}</span>
                </div>
                <span className="text-xs text-brand-textMuted">{formatRunTime(run.createdAt)}</span>
                <span className="text-xs text-brand-textMuted">@{userHandle}</span>
                <div className="flex justify-start md:justify-end">
                  <RunStatusBadge status={run.status} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
