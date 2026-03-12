import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";

import Navbar from "components/Navbar";
import ChartsTab from "components/run/ChartsTab";
import LogsTab from "components/run/LogsTab";
import { buildRunKey, useRunStore } from "stores/runs";
import { useScalarStore } from "stores/scalars";

type RunDetailTab = "charts" | "logs" | "artifacts";

export default function RunDetailRoute(): ReactElement {
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
  const [activeTab, setActiveTab] = useState<RunDetailTab>("charts");

  useEffect(() => {
    if (!run) { void fetchRun(handle, projectName, runName); }
  }, [fetchRun, handle, projectName, run, runName]);

  useEffect(() => {
    void fetchScalars(handle, projectName, runName);
  }, [fetchScalars, handle, projectName, runName]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar locationLabel={runName} parentLabel={projectName} parentHref={`/${handle}/projects/${projectName}`} />

      <div>
        <main className={`p-6 lg:p-8 ${activeTab === "logs" ? "flex min-h-[calc(100vh-83px)] flex-col" : ""}`}>
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{handle}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm">
                <Link className="text-brand-textMuted no-underline transition hover:text-brand-text" href={`/${handle}/projects/${projectName}`}>
                  {projectName}
                </Link>
                <span className="text-brand-textMuted">/</span>
                <span className="font-semibold text-brand-text">{runName}</span>
              </div>
            </div>
          </header>

          <div className="mb-5 border-b border-brand-border">
            <nav className="flex items-center gap-7" aria-label="Run detail tabs">
              {[
                { id: "charts", label: "Charts" },
                { id: "logs", label: "Logs" },
                { id: "artifacts", label: "Artifacts" }
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => { setActiveTab(tab.id as RunDetailTab); }}
                    className={`relative -mb-px border-b-2 px-0 py-2 text-[15px] font-medium transition-colors ${isActive ? "border-[#1a7b7d] text-brand-text" : "border-transparent text-brand-textMuted hover:text-brand-text"}`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{runError ?? "Run not found."}</div> : null}
          {run && runError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{runError}</div> : null}
          {scalarError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{scalarError}</div> : null}

          <div className={activeTab === "logs" ? "min-h-0 flex-1" : ""}>
            {activeTab === "charts" ? <ChartsTab scalars={scalars} runName={runName} isLoading={isScalarsLoading} /> : null}
            {activeTab === "logs" ? <LogsTab handle={handle} projectName={projectName} runName={runName} /> : null}
            {activeTab === "artifacts" ? <section className="rounded-[16px] border border-brand-border bg-brand-surface p-4 text-[13px] text-brand-textMuted shadow-soft">Artifacts coming soon.</section> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
