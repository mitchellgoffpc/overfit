import type { Project, Run, User } from "@underfit/types";
import type { ReactElement } from "react";
import { Link } from "wouter";

import RunStatusBadge from "components/RunStatusBadge";
import { formatDuration, formatMetadataValue, formatRunTime } from "helpers";

interface ProjectRunsTableProps {
  readonly runs: Run[];
  readonly project: Project;
  readonly user: User | null;
  readonly ownerHandle: string;
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function ProjectRunsTable({ runs, project, user, ownerHandle, isLoading, error }: ProjectRunsTableProps): ReactElement {
  return (
    <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl">Runs</h2>
          <p className="mt-1.5 text-[13px] text-brand-textMuted">All runs logged in this project.</p>
        </div>
        <div className="flex items-center">
          <div className="text-xs text-brand-textMuted">showing {runs.length}</div>
        </div>
      </div>

      {error ? <div className="py-3 text-[13px] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[13px] text-brand-textMuted">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="py-3 text-[13px] text-brand-textMuted">No runs yet for {project.name}.</div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[1240px]">
              <div className="grid grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] items-center gap-3 border-b border-brand-border px-3 py-2 text-xs uppercase tracking-[0.08em] text-brand-textMuted">
                <span>Name</span>
                <span>State</span>
                <span>Notes</span>
                <span>User</span>
                <span>Tags</span>
                <span>Created</span>
                <span>Runtime</span>
                <span>Sweep</span>
                <span>Batch</span>
                <span>D FF</span>
                <span>D Model</span>
                <span>Device</span>
                <span>Dropout</span>
              </div>
              {runs.map((run) => (
                <Link
                  className="grid grid-cols-[1.6fr_0.9fr_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr_0.7fr] items-center gap-3 rounded-xl border border-transparent bg-brand-surfaceMuted px-3 py-2 transition hover:border-brand-border"
                  key={run.id}
                  href={`/${ownerHandle}/projects/${project.name}/runs/${run.name}`}
                >
                  <div>
                    <p className="font-semibold">{run.name}</p>
                    <p className="mt-1 text-xs text-brand-textMuted">{project.name}</p>
                  </div>
                  <RunStatusBadge status={run.status} />
                  <span className="text-[13px] text-brand-textMuted">—</span>
                  <span>{user?.handle ?? run.user}</span>
                  <span className="text-[13px] text-brand-textMuted">—</span>
                  <span>{formatRunTime(run.createdAt)}</span>
                  <span>{formatDuration(run.createdAt, run.updatedAt)}</span>
                  <span className="text-[13px] text-brand-textMuted">—</span>
                  <span>{formatMetadataValue(run.metadata, "batch_size")}</span>
                  <span>{formatMetadataValue(run.metadata, "d_ff")}</span>
                  <span>{formatMetadataValue(run.metadata, "d_model")}</span>
                  <span>{formatMetadataValue(run.metadata, "device")}</span>
                  <span>{formatMetadataValue(run.metadata, "dropout")}</span>
                </Link>
              ))}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
