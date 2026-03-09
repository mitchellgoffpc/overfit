import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import LineChart from "components/charts/LineChart";
import Navbar from "components/Navbar";
import Sidebar from "components/Sidebar";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";
import { useRunStore } from "store/runs";
import { useScalarStore } from "store/scalars";

export default function RunDetailRoute(): ReactElement {
  const { projectId, runId } = useParams();
  const user = useAuthStore((state) => state.user);
  const projects = useProjectStore((state) => state.projects);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runs = useRunStore((state) => state.runs);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);
  const scalars = useScalarStore((state) => state.scalars);
  const scalarError = useScalarStore((state) => state.error);
  const isScalarsLoading = useScalarStore((state) => state.isLoading);
  const fetchScalars = useScalarStore((state) => state.fetchScalars);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (user) { void fetchRuns(user.id); }
  }, [fetchRuns, user]);

  useEffect(() => {
    if (runId) { void fetchScalars(runId); }
  }, [fetchScalars, runId]);

  const run = runs.find((item) => item.id === runId);
  const project = projects.find((item) => item.id === (projectId ?? run?.projectId));
  const chartSeries = useMemo(() => {
    const keys = new Set<string>();
    scalars.forEach((scalar) => {
      Object.keys(scalar.values).forEach((key) => {
        keys.add(key);
      });
    });

    const runColor = "#1a7b7d";
    return Array.from(keys).sort().map((key) => {
      const points = scalars.flatMap((scalar, scalarIndex) => {
        const value = scalar.values[key];
        if (typeof value !== "number") { return []; }
        return [{ x: scalar.step ?? scalarIndex, y: value }];
      });
      return { id: key, points, color: runColor, lineWidth: 2 };
    });
  }, [scalars]);

  const hasPoints = chartSeries.some((series) => series.points.length > 0);

  const sections = useMemo(() => {
    const buckets = new Map<string, typeof chartSeries>();
    chartSeries.forEach((series) => {
      const prefix = series.id.includes("/") ? series.id.split("/")[0] : "other";
      const list = buckets.get(prefix) ?? [];
      list.push(series);
      buckets.set(prefix, list);
    });

    const orderedPrefixes = ["train", "val"];
    const remaining = Array.from(buckets.keys()).filter((key) => !orderedPrefixes.includes(key)).sort();
    return [...orderedPrefixes, ...remaining].flatMap((prefix) => {
      const list = buckets.get(prefix);
      if (!list || list.length === 0) { return []; }
      return [{ prefix, series: list }];
    });
  }, [chartSeries]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar locationLabel={run?.name ?? "Run"} />

      <div className="lg:grid lg:grid-cols-[280px_1fr]">
        <Sidebar user={user} projects={projects} isLoading={isProjectsLoading} error={projectError} />

        <main className="p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{project?.name ?? "Project"}</p>
              <h1 className="mt-1 font-display text-3xl">{run?.name ?? "Run details"}</h1>
              <p className="mt-1 text-sm text-brand-textMuted">Live metrics and training history.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 font-semibold text-brand-text shadow-none" type="button">
                View logs
              </button>
              <button className="rounded-xl bg-brand-accent px-4 py-2.5 font-semibold text-white shadow-soft" type="button">
                Share run
              </button>
            </div>
          </header>

          {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">Run not found.</div> : null}
          {runError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{runError}</div> : null}
          {scalarError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{scalarError}</div> : null}

          {sections.map((section) => (
            <section key={section.prefix} className="mb-6 last:mb-0">
              {(() => {
                const isCollapsed = collapsedSections[section.prefix] ?? false;
                return (
                  <>
                    <header className="mb-3 flex items-center justify-between gap-2">
                      <button
                        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-brand-textMuted"
                        type="button"
                        onClick={() => {
                          setCollapsedSections((prev) => ({ ...prev, [section.prefix]: !isCollapsed }));
                        }}
                      >
                        <span className={`transition-transform ${isCollapsed ? "-rotate-90" : "rotate-0"}`}>
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                            <path d="M4 6.25 8 10l4-3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                          </svg>
                        </span>
                        <span>{section.prefix}</span>
                        <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] font-semibold text-brand-textMuted">
                          {section.series.length}
                        </span>
                      </button>
                    </header>
                    {isCollapsed ? null : (
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {section.series.map((series) => {
                          const label = series.id.includes("/") ? series.id.split("/").slice(1).join("/") : series.id;
                          return (
                            <div key={series.id} className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                  <h2 className="text-xl">{label}</h2>
                                </div>
                              </div>
                              {!hasPoints && !isScalarsLoading ? <div className="mb-4 text-[13px] text-brand-textMuted">No scalar data yet.</div> : null}
                              <LineChart className="h-[240px] w-full" series={series.points.length > 0 ? [series] : []} height={240} xLabelFormatter={(value) => value.toFixed(0)} yLabelFormatter={(value) => value.toFixed(2)} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
