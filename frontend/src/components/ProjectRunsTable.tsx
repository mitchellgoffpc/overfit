import type { Project, Run, User } from "@underfit/types";
import type { ReactElement } from "react";

interface ProjectRunsTableProps {
  readonly runs: Run[];
  readonly project: Project;
  readonly user: User | null;
  readonly isLoading: boolean;
  readonly error: string | null;
}

const formatRunTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) { return "Unknown time"; }
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatDuration = (start: string, end: string): string => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) { return "—"; }
  const deltaMs = Math.max(0, endTime - startTime);
  const totalSeconds = Math.floor(deltaMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  if (hours > 0) { return `${hours.toString()}h ${minutes.toString()}m`; }
  if (minutes > 0) { return `${minutes.toString()}m ${seconds.toString()}s`; }
  return `${seconds.toString()}s`;
};

const formatMetadataValue = (metadata: Run["metadata"], key: string): string => {
  if (!metadata || typeof metadata !== "object") { return "—"; }
  const value = metadata[key];
  if (value === null || value === undefined) { return "—"; }
  if (typeof value === "number") {
    const fixed = Number.isInteger(value) ? String(value) : value.toFixed(4);
    return fixed.replace(/\.0+$/, "").replace(/\.$/, "");
  }
  if (typeof value === "string" || typeof value === "boolean") { return String(value); }
  return "—";
};

const formatStatus = (status: Run["status"]): string => status.replace(/^[a-z]/, (char) => char.toUpperCase());

export default function ProjectRunsTable({ runs, project, user, isLoading, error }: ProjectRunsTableProps): ReactElement {
  return (
    <section className="panel panel--runs-table">
      <div className="panel__header">
        <div>
          <h2 className="panel__title">Runs</h2>
          <p className="panel__subtitle">All runs logged in this project.</p>
        </div>
        <div className="panel__actions">
          <div className="panel__pager">showing {runs.length}</div>
        </div>
      </div>

      {error ? <div className="panel__empty">{error}</div> : null}
      {!error && isLoading ? <div className="panel__empty">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="panel__empty">No runs yet for {project.name}.</div>
        ) : (
          <div className="table__scroll">
            <div className="table table--runs">
              <div className="table__head">
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
                <div className="table__row" key={run.id}>
                  <div>
                    <p className="table__name">{run.name}</p>
                    <p className="table__description">{project.name}</p>
                  </div>
                  <span className={`runs__status runs__status--${run.status}`}>{formatStatus(run.status)}</span>
                  <span className="table__muted">—</span>
                  <span>{user?.handle ?? run.userId}</span>
                  <span className="table__muted">—</span>
                  <span>{formatRunTime(run.createdAt)}</span>
                  <span>{formatDuration(run.createdAt, run.updatedAt)}</span>
                  <span className="table__muted">—</span>
                  <span>{formatMetadataValue(run.metadata, "batch_size")}</span>
                  <span>{formatMetadataValue(run.metadata, "d_ff")}</span>
                  <span>{formatMetadataValue(run.metadata, "d_model")}</span>
                  <span>{formatMetadataValue(run.metadata, "device")}</span>
                  <span>{formatMetadataValue(run.metadata, "dropout")}</span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
