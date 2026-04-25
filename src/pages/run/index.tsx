import { faChartLine, faFileLines, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { Route, Switch, useLocation, useParams } from "wouter";

import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import { formatRunTime, getRunStatus, RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import RunChartsPage from "pages/run/charts";
import RunFilesPage from "pages/run/files";
import RunLogsPage from "pages/run/logs";
import { buildRunKey, fetchRun, useRunStore } from "stores/runs";

export default function RunDetailRoute(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const runKey = buildRunKey(handle, projectName, runName);
  const run = useRunStore((state) => state.runs[runKey]);
  const isRunsLoading = useRunStore((state) => state.isLoading[runKey] ?? false);

  useEffect(() => {
    if (!run) { void fetchRun(handle, projectName, runName); }
  }, [handle, projectName, run, runName]);

  const [location] = useLocation();
  const basePath = `/${handle}/${projectName}/runs/${runName}`;
  const afterBase = location.slice(basePath.length);
  const activeTab = afterBase.startsWith("/logs") ? "logs" : afterBase.startsWith("/files") ? "files" : "charts";
  const tabs = [
    { id: "charts", label: "Charts", href: basePath, icon: faChartLine },
    { id: "logs", label: "Logs", href: `${basePath}/logs`, icon: faFileLines },
    { id: "files", label: "Files", href: `${basePath}/files`, icon: faFolderOpen }
  ];
  const runStatus = run ? getRunStatus(run) : null;
  const statusColorClass = runStatus === "running" ? "bg-signal-running" : runStatus === "failed" ? "bg-signal-failed" : "bg-brand-border";

  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar
        breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: projectName, href: `/${handle}/${projectName}` }, { label: runName }]}
        tabs={tabs}
        activeTabId={activeTab}
      />

      <NotebookShell columns="18.25rem 1fr" className="max-w-full md:max-w-[calc(100%-5rem)]">
        <aside
          className="relative pb-5 px-4 lg:border-r lg:pb-6 lg:pr-5"
          style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}
        >
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Run Ledger</p>
          <h1 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>{runName}</h1>

          <div className="mt-5 rounded-[0.75rem] border border-brand-borderMuted bg-white/85 px-3 py-3">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Overview</p>
            {run ? (
              <>
                <div className="mt-2 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">status</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColorClass}`} />
                    {runStatus}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">created</span>
                  <span className="font-semibold">{formatRunTime(run.createdAt)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">updated</span>
                  <span className="font-semibold">{formatRunTime(run.updatedAt)}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-[0.75rem] text-brand-textMuted">{isRunsLoading ? "Loading run..." : "Run not found."}</div>
            )}
          </div>
        </aside>

        <Switch>
          <Route path="/:handle/:projectName/runs/:runName/logs" component={RunLogsPage} />
          <Route path="/:handle/:projectName/runs/:runName/files/*?" component={RunFilesPage} />
          <Route path="/:handle/:projectName/runs/:runName" component={RunChartsPage} />
        </Switch>
      </NotebookShell>
    </div>
  );
}
