import type { Project, Run } from "@underfit/types";
import type { ReactElement } from "react";

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

export default function RunsPanel({ runs, projects, isLoading, error }: RunsPanelProps): ReactElement {
  const projectNames = new Map(projects.map((project) => [project.id, project.name]));

  return (
    <section className="panel panel--runs">
      {runs.length > 0 ? (
        <div className="panel__header">
          <div>
            <h2 className="panel__title">Recent runs</h2>
            <p className="panel__subtitle">Latest activity across your projects.</p>
          </div>
          <div className="panel__actions">
            <div className="panel__pager">showing {runs.length}</div>
          </div>
        </div>
      ) : null}

      {error ? <div className="panel__empty">{error}</div> : null}
      {!error && isLoading ? <div className="panel__empty">Loading runs...</div> : null}

      {!error && !isLoading ? (
        runs.length === 0 ? (
          <div className="quickstart">
            <div className="quickstart__header">
              <h3 className="quickstart__title">Quickstart: Track your first run</h3>
              <p className="quickstart__subtitle">Create a project, log a run, and watch metrics stream in.</p>
            </div>

            <div className="quickstart__step">
              <div className="quickstart__badge">1</div>
              <div>
                <p className="quickstart__step-title">Install the Underfit SDK</p>
                <div className="quickstart__code">pip install underfit</div>
              </div>
            </div>

            <div className="quickstart__step">
              <div className="quickstart__badge">2</div>
              <div>
                <p className="quickstart__step-title">Authenticate with your workspace</p>
                <div className="quickstart__code">underfit login</div>
              </div>
            </div>

            <div className="quickstart__step">
              <div className="quickstart__badge">3</div>
              <div>
                <p className="quickstart__step-title">Log your first run</p>
                <pre className="quickstart__snippet">
                  <code>{`import underfit

run = underfit.init(project="vision-baseline")
run.log({"accuracy": 0.92, "loss": 0.18})
run.finish()`}</code>
                </pre>
              </div>
            </div>

            <div className="quickstart__footer">
              Tip: runs show up here as soon as they start streaming.
            </div>
          </div>
        ) : (
          <div className="runs">
            {runs.map((run) => (
              <div className="runs__row" key={run.id}>
                <div className="runs__main">
                  <div className="runs__title">{run.name}</div>
                  <div className="runs__meta">
                    <span>{projectNames.get(run.projectId) ?? "Unknown project"}</span>
                    <span className="runs__dot">•</span>
                    <span>{formatRunTime(run.createdAt)}</span>
                  </div>
                </div>
                <div className={`runs__status runs__status--${run.status}`}>
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
