import { faChartLine, faFileLines, faFolderOpen } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { Link, Route, Switch, useLocation, useParams } from "wouter";

import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import { formatRunTime } from "helpers";
import RunChartsPage from "pages/run/charts";
import RunFilesPage from "pages/run/files";
import RunLogsPage from "pages/run/logs";
import { buildRunKey, useRunStore } from "stores/runs";

export default function RunDetailRoute(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const runKey = buildRunKey(handle, projectName, runName);
  const run = useRunStore((state) => state.runsByKey[runKey]);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRun = useRunStore((state) => state.fetchRun);

  useEffect(() => {
    if (!run) { void fetchRun(handle, projectName, runName); }
  }, [fetchRun, handle, projectName, run, runName]);

  const [location] = useLocation();
  const basePath = `/${handle}/${projectName}/runs/${runName}`;
  const afterBase = location.slice(basePath.length);
  const activeTab = afterBase.startsWith("/logs") ? "logs" : afterBase.startsWith("/files") ? "files" : "charts";
  const tabs = [
    { id: "charts", label: "Charts", href: basePath, icon: faChartLine },
    { id: "logs", label: "Logs", href: `${basePath}/logs`, icon: faFileLines },
    { id: "files", label: "Files", href: `${basePath}/files`, icon: faFolderOpen }
  ];
  const statusColorClass = run?.status === "running" ? "bg-[#24b26b]" : run?.status === "failed" ? "bg-[#bb5f5f]" : "bg-brand-border";

  return (
    <div className="min-h-screen bg-[#e9efed] text-brand-text">
      <Navbar
        breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: projectName, href: `/${handle}/${projectName}` }, { label: runName }]}
        tabs={tabs}
        activeTabId={activeTab}
        tabsMaxWidth="100vw"
      />

      <NotebookShell columns="18.75rem 1fr" maxWidth="calc(100% - 5rem)">

        <aside className="relative border-b border-[#d2dfdf] px-5 py-5 lg:border-b-0 lg:border-r lg:pl-14 lg:pr-5 lg:py-6">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
          <h1 className="mt-1 font-display text-[2.0625rem] leading-none text-brand-text">{runName}</h1>
          <p className="mt-1 font-mono text-[0.6875rem] text-brand-textMuted">
            @{handle} /{" "}
            <Link className="text-brand-textMuted no-underline transition hover:text-brand-text" href={`/${handle}/${projectName}`}>
              {projectName}
            </Link>
          </p>

          <div className="mt-3 rounded-[0.75rem] border border-[#d2dede] bg-white/85 px-3 py-3">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Run Ledger</p>
            {run ? (
              <>
                <div className="mt-2 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">status</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColorClass}`} />
                    {run.status}
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
