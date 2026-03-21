import { faBoxArchive, faChartLine, faFileLines } from "@fortawesome/free-solid-svg-icons";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { Link, useParams } from "wouter";

import Navbar from "components/Navbar";
import ChartsTab from "components/run/ChartsTab";
import LogsTab from "components/run/LogsTab";
import { buildRunKey, useRunStore } from "stores/runs";
import { useScalarStore } from "stores/scalars";

type RunDetailSection = "charts" | "logs" | "artifacts";
interface RunDetailRouteProps {
  readonly section?: RunDetailSection;
}

const formatTimestamp = (value: string): string =>
  new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const sectionTitleById: Record<RunDetailSection, string> = { charts: "Scalar Plots", logs: "Runtime Logs", artifacts: "Artifacts" };
const sectionSubtitleById: Record<RunDetailSection, string> = {
  charts: "training + validation metrics",
  logs: "live stream + search",
  artifacts: "stored outputs"
};

export default function RunDetailRoute({ section = "charts" }: RunDetailRouteProps): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const runKey = buildRunKey(handle, projectName, runName);
  const run = useRunStore((state) => state.runsByKey[runKey]);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRun = useRunStore((state) => state.fetchRun);
  const scalars = useScalarStore((state) => state.scalars);
  const scalarError = useScalarStore((state) => state.error);
  const isScalarsLoading = useScalarStore((state) => state.isLoading);
  const fetchScalars = useScalarStore((state) => state.fetchScalars);

  useEffect(() => {
    if (!run) { void fetchRun(handle, projectName, runName); }
  }, [fetchRun, handle, projectName, run, runName]);

  useEffect(() => {
    void fetchScalars(handle, projectName, runName);
  }, [fetchScalars, handle, projectName, runName]);
  const tabs = [
    { id: "charts", label: "Charts", href: `/${handle}/${projectName}/runs/${runName}`, icon: faChartLine },
    { id: "logs", label: "Logs", href: `/${handle}/${projectName}/runs/${runName}/logs`, icon: faFileLines },
    { id: "artifacts", label: "Artifacts", href: `/${handle}/${projectName}/runs/${runName}/artifacts`, icon: faBoxArchive }
  ];
  const isLogsSection = section === "logs";
  const statusColorClass = run?.status === "running" ? "bg-[#24b26b]" : run?.status === "failed" ? "bg-[#bb5f5f]" : "bg-brand-border";

  return (
    <div className="min-h-screen bg-[#e9efed] text-brand-text">
      <Navbar
        breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: projectName, href: `/${handle}/${projectName}` }, { label: runName }]}
        tabs={tabs}
        activeTabId={section}
        tabsMaxWidth="100vw"
      />

      <div
        className={"relative mx-auto w-full overflow-hidden border-x border-b border-[#c4d1d1] bg-[#f8fcfa]"
          + " shadow-[0_14px_36px_rgba(30,52,52,0.18)] lg:grid lg:grid-cols-[300px_1fr]"}
        style={{ maxWidth: "calc(100% - 80px)" }}
      >
        <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[14px] bg-[#dce7e4]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.2) 1px, transparent 1px)", backgroundSize: "100% 30px" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-10 top-0 w-px bg-[#efb1b1]/70" aria-hidden />

        <aside className="relative border-b border-[#d2dfdf] px-5 py-5 lg:border-b-0 lg:border-r lg:pl-14 lg:pr-5 lg:py-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
          <h1 className="mt-1 font-display text-[33px] leading-none text-brand-text">{runName}</h1>
          <p className="mt-1 font-mono text-[11px] text-brand-textMuted">
            @{handle} /{" "}
            <Link className="text-brand-textMuted no-underline transition hover:text-brand-text" href={`/${handle}/${projectName}`}>
              {projectName}
            </Link>
          </p>

          <div className="mt-3 rounded-[12px] border border-[#d2dede] bg-white/85 px-3 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Run Ledger</p>
            {run ? (
              <>
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className="text-brand-textMuted">status</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColorClass}`} />
                    {run.status}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[12px]">
                  <span className="text-brand-textMuted">created</span>
                  <span className="font-semibold">{formatTimestamp(run.createdAt)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[12px]">
                  <span className="text-brand-textMuted">updated</span>
                  <span className="font-semibold">{formatTimestamp(run.updatedAt)}</span>
                </div>
              </>
            ) : (
              <div className="mt-2 text-[12px] text-brand-textMuted">{isRunsLoading ? "Loading run..." : "Run not found."}</div>
            )}
          </div>
        </aside>

        <main className={`relative p-6 ${isLogsSection ? "flex min-h-[520px] flex-col" : ""}`}>
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d4dfdf] pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Section A</p>
              <h2 className="mt-1 font-display text-[34px] leading-none text-brand-text">{sectionTitleById[section]}</h2>
            </div>
            <div className="rounded-full border border-[#cfdddd] bg-white/90 px-3 py-1 text-[12px] text-brand-textMuted">
              {sectionSubtitleById[section]}
            </div>
          </header>

          {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{runError ?? "Run not found."}</div> : null}
          {run && runError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{runError}</div> : null}
          {scalarError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{scalarError}</div> : null}

          <div className={isLogsSection ? "min-h-0 flex-1" : ""}>
            {section === "charts" ? <ChartsTab scalars={scalars} runName={runName} isLoading={isScalarsLoading} /> : null}
            {section === "logs" ? <LogsTab handle={handle} projectName={projectName} runName={runName} /> : null}
            {section === "artifacts" ? (
              <section
                className="rounded-[14px] border border-[#d2dede] bg-white/90 p-4 text-[13px] text-brand-textMuted shadow-[0_8px_20px_rgba(23,43,43,0.06)]"
              >
                Artifacts coming soon.
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
