import type { Run, Scalar } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import { getClosestPoint, xFormatter, yFormatter } from "charts/helpers";
import type { LineSeries } from "charts/lineChart";
import type { LineChartHover } from "components/charts/LineChart";
import LineChart from "components/charts/LineChart";
import NotebookShell from "components/NotebookShell";
import ProjectHeader from "components/project/ProjectHeader";
import SectionHeader from "components/SectionHeader";
import { formatRunTime } from "helpers";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";
import { fetchRunScalars } from "stores/scalars";

const tooltipClass = "pointer-events-none absolute z-10 max-w-[17.5rem] rounded-[0.625rem] border border-brand-border"
  + " bg-brand-surface/96 px-3 py-2 shadow-soft backdrop-blur";
const runColors = ["#1a7b7d", "#e16367", "#5f86d5", "#a06ac9", "#d48834", "#2f9f77", "#ca5d94", "#61738a"];
const sectionLabels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface CompareChartSeries extends LineSeries {
  readonly runName: string;
  readonly color: string;
  readonly lineWidth: number;
}

const getSeriesPoints = (scalars: Scalar[], metric: string): { x: number; y: number }[] =>
  scalars.flatMap((scalar, scalarIndex) => {
    const value = scalar.values[metric];
    if (typeof value !== "number") { return []; }
    return [{ x: scalar.step ?? scalarIndex, y: value }];
  });
export default function ProjectCompareRoute(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const runsByKey = useRunStore((state) => state.runsByKey);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchProjectRuns = useRunStore((state) => state.fetchProjectRuns);
  const [scalarsByRun, setScalarsByRun] = useState<Record<string, Scalar[]>>({});
  const [isScalarsLoading, setIsScalarsLoading] = useState(false);
  const [scalarError, setScalarError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [hoveredSections, setHoveredSections] = useState<Record<string, LineChartHover | null>>({});
  const [hiddenRunNames, setHiddenRunNames] = useState<Record<string, boolean>>({});

  const projectList = Object.values(projectsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);

  useEffect(() => {
    void fetchProjectRuns(handle, projectName);
  }, [fetchProjectRuns, handle, projectName]);

  const projectRuns = useMemo(
    () => (!project ? [] : Object.values(runsByKey).filter((run) => run.projectId === project.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    [project, runsByKey]
  );
  const showProjectNotFound = !project && !isProjectsLoading;

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (projectRuns.length === 0) {
        if (!cancelled) {
          setScalarsByRun({});
          setIsScalarsLoading(false);
          setScalarError(null);
        }
        return;
      }

      if (!cancelled) {
        setIsScalarsLoading(true);
        setScalarError(null);
      }
      const responses = await Promise.all(projectRuns.map(async (run) => ({ run, response: await fetchRunScalars(handle, projectName, run.name) })));
      if (cancelled) { return; }
      const nextScalarsByRun: Record<string, Scalar[]> = {};
      const failedRuns: string[] = [];
      for (const { run, response } of responses) {
        if (response.ok) {
          nextScalarsByRun[run.name] = response.body;
        } else {
          nextScalarsByRun[run.name] = [];
          failedRuns.push(run.name);
        }
      }
      setScalarsByRun(nextScalarsByRun);
      setIsScalarsLoading(false);
      setScalarError(failedRuns.length === 0 ? null : `Unable to load scalars for ${failedRuns.join(", ")}.`);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [handle, projectName, projectRuns]);

  const colorByRunName = useMemo(
    () => new Map(projectRuns.map((run, index) => [run.name, runColors[index % runColors.length] ?? "#1a7b7d"])),
    [projectRuns]
  );
  const visibleRuns = useMemo(() => projectRuns.filter((run) => hiddenRunNames[run.name] !== true), [hiddenRunNames, projectRuns]);
  const runningCount = useMemo(() => projectRuns.filter((run) => run.status === "running").length, [projectRuns]);
  const failedCount = useMemo(() => projectRuns.filter((run) => run.status === "failed").length, [projectRuns]);

  const chartSeries = useMemo(() => {
    const metricKeys = new Set<string>();
    for (const run of visibleRuns) {
      const scalars = scalarsByRun[run.name] ?? [];
      for (const scalar of scalars) {
        for (const metric of Object.keys(scalar.values)) { metricKeys.add(metric); }
      }
    }

    return Array.from(metricKeys).sort().map((metric) => ({
      id: metric,
      series: visibleRuns.map((run, index) => ({
        id: `${metric}:${run.name}`,
        runName: run.name,
        points: getSeriesPoints(scalarsByRun[run.name] ?? [], metric),
        color: colorByRunName.get(run.name) ?? runColors[index % runColors.length] ?? "#1a7b7d",
        lineWidth: 2
      }))
    }));
  }, [colorByRunName, scalarsByRun, visibleRuns]);

  const sections = useMemo(() => {
    const buckets = new Map<string, typeof chartSeries>();
    chartSeries.forEach((item) => {
      const [firstSegment] = item.id.split("/");
      const prefix = item.id.includes("/") ? (firstSegment ?? "other") : "other";
      const list = buckets.get(prefix) ?? [];
      list.push(item);
      buckets.set(prefix, list);
    });
    return Array.from(buckets.keys()).sort().flatMap((prefix) => {
      const list = buckets.get(prefix);
      if (!list || list.length === 0) { return []; }
      return [{ prefix, charts: list }];
    });
  }, [chartSeries]);

  const hasPoints = useMemo(() => chartSeries.some((item) => item.series.some((series) => series.points.length > 0)), [chartSeries]);

  const onChartHover = (prefix: string, hover: LineChartHover | null) => {
    setHoveredSections((prev) => {
      const current = prev[prefix] ?? null;
      if (!hover && !current) { return prev; }
      if (hover?.step === current?.step) { return prev; }
      return { ...prev, [prefix]: hover };
    });
  };

  const renderMetricChart = (prefix: string, metric: string, series: CompareChartSeries[]) => {
    const label = metric.includes("/") ? metric.split("/").slice(1).join("/") : metric;
    const hovered = hoveredSections[prefix] ?? null;
    const tooltipSeries = hovered ? series.flatMap((line) => {
      const point = getClosestPoint(line, hovered.step);
      if (!point) { return []; }
      return [{ runName: line.runName, color: line.color, value: point.y }];
    }) : [];
    const isLeft = (hovered?.xRatio ?? 0) < 0.5;
    const tooltipStyle = !hovered ? undefined
      : { left: `${String(hovered.cursorX)}px`, top: "0.5rem", transform: isLeft ? "translateX(0.75rem)" : "translateX(calc(-100% - 0.75rem))" };

    return (
      <div
        className={"relative rounded-[0.875rem] border border-[#cfdddd] bg-white/95 px-3 pb-2 pt-3"
          + " shadow-[0_0.5rem_1.25rem_rgba(23,43,43,0.06)]"}
        key={metric}
      >
        <div className="mb-1.5 flex flex-col items-center gap-0">
          <h2 className="text-[0.8125rem] font-semibold text-brand-text">{label}</h2>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.6875rem] text-brand-textMuted">
            {series.map((line) => (
              <div className="flex items-center gap-1.5" key={line.id}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
                <span className="max-w-[7.5rem] truncate">{line.runName}</span>
              </div>
            ))}
          </div>
        </div>
        {!hasPoints && !isScalarsLoading ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">No scalar data yet.</div> : null}
        <div className="relative">
          {hovered && tooltipSeries.length > 0 ? (
            <div className={tooltipClass} style={tooltipStyle}>
              <div className="mb-1 text-[0.6875rem] text-brand-textMuted">step {xFormatter(hovered.step)}</div>
              <div className="space-y-1.5">
                {tooltipSeries.map((item) => (
                  <div className="flex items-center justify-between gap-3 text-[0.75rem] text-brand-text" key={item.runName}>
                    <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.runName}</span>
                    </div>
                    <span className="font-semibold">{yFormatter(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <LineChart
            className="h-[14.375rem] w-full"
            series={series.filter((line) => line.points.length > 0)}
            height={230}
            xLabelFormatter={xFormatter}
            yLabelFormatter={yFormatter}
            hoverStep={hovered?.step ?? null}
            onHover={(hover) => { onChartHover(prefix, hover); }}
          />
        </div>
      </div>
    );
  };

  const renderRunItem = (run: Run, index: number) => {
    const isVisible = hiddenRunNames[run.name] !== true;
    const color = runColors[index % runColors.length] ?? "#1a7b7d";
    const isActive = run.status === "running";
    return (
      <button
        className={[
          "relative flex h-[1.875rem] w-full items-center justify-between text-left transition",
          isVisible ? "bg-transparent hover:bg-white/35" : "bg-transparent opacity-60"
        ].join(" ")}
        key={run.id}
        onClick={() => { setHiddenRunNames((prev) => ({ ...prev, [run.name]: prev[run.name] !== true })); }}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-[0.75rem] font-semibold leading-5">{run.name}</span>
        </div>
        <div className="ml-2 flex items-center gap-2 text-[0.625rem] text-brand-textMuted">
          <span>{formatRunTime(run.createdAt)}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#24b26b]" : "bg-brand-border"}`} />
        </div>
      </button>
    );
  };

  return (
    <NotebookShell columns="18.25rem 1fr" maxWidth="calc(100% - 5rem)">

        {!showProjectNotFound ? (
          <aside className="relative border-b border-[#d2dfdf] px-5 py-5 lg:border-b-0 lg:border-r lg:pl-[4.125rem] lg:pr-5">
            <div className="lg:h-[15.375rem]">
              <ProjectHeader handle={handle} projectName={projectName} />

              <div className="mt-3 rounded-xl border border-[#d2dede] bg-white/85 px-3 py-3">
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Run Ledger</p>
                <div className="mt-2 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">total</span>
                  <span className="font-semibold">{projectRuns.length}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">running</span>
                  <span className="font-semibold text-[#2d7172]">{runningCount}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[0.75rem]">
                  <span className="text-brand-textMuted">failed</span>
                  <span className="font-semibold text-[#bb5f5f]">{failedCount}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  className={"flex-1 rounded-lg border border-[#c2d7d6] bg-[#eff6f5] px-2 py-1.5"
                    + " text-[0.6875rem] font-semibold text-brand-text transition hover:bg-white"}
                  onClick={() => { setHiddenRunNames({}); }}
                  type="button"
                >
                  Show all
                </button>
                <button
                  className={"flex-1 rounded-lg border border-[#d4dfdf] bg-white/80 px-2 py-1.5"
                    + " text-[0.6875rem] font-semibold text-brand-text transition hover:bg-white"}
                  onClick={() => { setHiddenRunNames(Object.fromEntries(projectRuns.map((run) => [run.name, true]))); }}
                  type="button"
                >
                  Hide all
                </button>
              </div>
            </div>

            <div className="grid">
              {projectRuns.length === 0 && !isRunsLoading ? <div className="py-1 text-[0.8125rem] text-brand-textMuted">No runs yet.</div> : null}
              {projectRuns.map(renderRunItem)}
            </div>
          </aside>
        ) : null}

        <main className="relative p-6">
          <SectionHeader
            title="Comparison Plots"
            subtitle={`plotting ${String(visibleRuns.length)} / ${String(projectRuns.length)} runs`}
            sectionLabel="Section D"
          />

          {showProjectNotFound ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
          {runError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div> : null}
          {scalarError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{scalarError}</div> : null}
          {!showProjectNotFound ? (
            <section>
              {isRunsLoading || isScalarsLoading ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">Loading charts...</div> : null}
              {visibleRuns.length === 0 ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">Select at least one run to view charts.</div> : null}
              {sections.map(({ prefix, charts }, sectionIndex) => (
                <section className="mb-7 last:mb-0" key={prefix}>
                  <header className="mb-3 flex items-center justify-between gap-2">
                    <button
                      className="flex items-center gap-2 text-left text-sm font-semibold uppercase tracking-[0.12em] text-brand-textMuted"
                      type="button"
                      onClick={() => { setCollapsedSections((prev) => ({ ...prev, [prefix]: !(prev[prefix] ?? false) })); }}
                    >
                      <span className={`transition-transform ${collapsedSections[prefix] ? "-rotate-90" : "rotate-0"}`}>
                        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                          <path d="M4 6.25 8 10l4-3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                        </svg>
                      </span>
                      <span>Section {sectionLabels[sectionIndex] ?? "Z"} · {prefix}</span>
                      <span className="rounded-full border border-[#d0dddd] bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-textMuted">
                        {charts.length}
                      </span>
                    </button>
                  </header>
                  {collapsedSections[prefix] ? null : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {charts.map((item) => renderMetricChart(prefix, item.id, item.series))}
                    </div>
                  )}
                </section>
              ))}
              {!isScalarsLoading && sections.length === 0 ? <div className="text-[0.8125rem] text-brand-textMuted">No scalar data yet.</div> : null}
            </section>
          ) : null}
        </main>
      </NotebookShell>
  );
}
