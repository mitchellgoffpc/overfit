import { faBoxArchive, faChartLine, faFileLines } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { Link, Route, Switch, useLocation, useParams } from "wouter";

import Navbar from "components/Navbar";
import RunArtifactsPage from "pages/run/artifacts";
import RunChartsPage from "pages/run/charts";
import RunLogsPage from "pages/run/logs";
import { buildRunKey, useRunStore } from "stores/runs";

const formatTimestamp = (value: string): string =>
  new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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
  const activeTab = location.endsWith("/logs") ? "logs" : location.endsWith("/artifacts") ? "artifacts" : "charts";
  const basePath = `/${handle}/${projectName}/runs/${runName}`;
  const tabs = [
    { id: "charts", label: "Charts", href: basePath, icon: faChartLine },
    { id: "logs", label: "Logs", href: `${basePath}/logs`, icon: faFileLines },
    { id: "artifacts", label: "Artifacts", href: `${basePath}/artifacts`, icon: faBoxArchive }
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

      <div
        className={"relative mx-auto w-full overflow-hidden border-x border-b border-[#c4d1d1] bg-[#f8fcfa]"
          + " shadow-[0_0.875rem_2.25rem_rgba(30,52,52,0.18)] lg:grid lg:grid-cols-[18.75rem_1fr]"}
        style={{ maxWidth: "calc(100% - 5rem)" }}
      >
        <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[0.875rem] bg-[#dce7e4]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.2) 1px, transparent 1px)", backgroundSize: "100% 1.875rem" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-10 top-0 w-px bg-[#efb1b1]/70" aria-hidden />

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
                  <span className="font-semibold">{formatTimestamp(run.createdAt)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">updated</span>
                  <span className="font-semibold">{formatTimestamp(run.updatedAt)}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-[0.75rem] text-brand-textMuted">{isRunsLoading ? "Loading run..." : "Run not found."}</div>
            )}
          </div>
        </aside>

        <Switch>
          <Route path="/:handle/:projectName/runs/:runName/logs" component={RunLogsPage} />
          <Route path="/:handle/:projectName/runs/:runName/artifacts" component={RunArtifactsPage} />
          <Route path="/:handle/:projectName/runs/:runName" component={RunChartsPage} />
        </Switch>
      </div>
    </div>
  );
}
