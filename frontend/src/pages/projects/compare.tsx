import type { Run, Scalar } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";

import type { LineChartHover } from "components/charts/LineChart";
import LineChart from "components/charts/LineChart";
import Navbar from "components/Navbar";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";
import { fetchRunScalars } from "stores/scalars";

const tooltipClass = "pointer-events-none absolute z-10 max-w-[280px] rounded-[10px] border border-brand-border"
  + " bg-brand-surface/96 px-3 py-2 shadow-soft backdrop-blur";
const runColors = ["#1a7b7d", "#e16367", "#5f86d5", "#a06ac9", "#d48834", "#2f9f77", "#ca5d94", "#61738a"];
const xFormatter = (value: number) => value.toFixed(0);
const yFormatter = (value: number) => value.toFixed(2);

interface ChartSeries {
  readonly id: string;
  readonly runName: string;
  readonly points: { x: number; y: number }[];
  readonly color: string;
  readonly lineWidth: number;
}

const getClosestPoint = (series: ChartSeries, targetX: number): { x: number; y: number } | null => {
  let closest: { x: number; y: number } | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const point of series.points) {
    const distance = Math.abs(point.x - targetX);
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = point;
    }
  }
  return closest;
};

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
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const fetchProject = useProjectStore((state) => state.fetchProject);
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

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [fetchProjects, handle]);

  const projectList = Object.values(projectsByKey);
  const projectKey = buildProjectKey(handle, projectName);
  const project = projectsByKey[projectKey] ?? projectList.find((item) => item.name === projectName);

  useEffect(() => {
    if (!project) { void fetchProject(handle, projectName); }
  }, [fetchProject, handle, project, projectName]);

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

  const renderMetricChart = (prefix: string, metric: string, series: ChartSeries[]) => {
    const label = metric.includes("/") ? metric.split("/").slice(1).join("/") : metric;
    const hovered = hoveredSections[prefix] ?? null;
    const tooltipSeries = hovered ? series.flatMap((line) => {
      const point = getClosestPoint(line, hovered.step);
      if (!point) { return []; }
      return [{ runName: line.runName, color: line.color, value: point.y }];
    }) : [];
    const isLeft = (hovered?.xRatio ?? 0) < 0.5;
    const tooltipStyle = !hovered ? undefined
      : { left: `${String(hovered.cursorX)}px`, top: "8px", transform: isLeft ? "translateX(12px)" : "translateX(calc(-100% - 12px))" };

    return (
      <div className="relative rounded-[12px] border border-brand-border bg-brand-surface px-2 pb-[6px] pt-2 shadow-soft" key={metric}>
        <div className="mb-1 flex flex-col items-center gap-0">
          <h2 className="text-[13px] font-semibold text-brand-text">{label}</h2>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-brand-textMuted">
            {series.map((line) => (
              <div className="flex items-center gap-1.5" key={line.id}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
                <span className="max-w-[120px] truncate">{line.runName}</span>
              </div>
            ))}
          </div>
        </div>
        {!hasPoints && !isScalarsLoading ? <div className="mb-4 text-[13px] text-brand-textMuted">No scalar data yet.</div> : null}
        <div className="relative">
          {hovered && tooltipSeries.length > 0 ? (
            <div className={tooltipClass} style={tooltipStyle}>
              <div className="mb-1 text-[11px] text-brand-textMuted">step {xFormatter(hovered.step)}</div>
              <div className="space-y-1.5">
                {tooltipSeries.map((item) => (
                  <div className="flex items-center justify-between gap-3 text-[12px] text-brand-text" key={item.runName}>
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
            className="h-[220px] w-full"
            series={series.filter((line) => line.points.length > 0)}
            height={220}
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
          "relative w-full px-4 py-2 text-left transition lg:px-5",
          "after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-brand-border/70 after:content-['']",
          "lg:after:left-5 lg:after:right-5 last:after:hidden",
          isVisible ? "bg-transparent hover:bg-brand-surface/70" : "bg-transparent opacity-65"
        ].join(" ")}
        key={run.id}
        onClick={() => { setHiddenRunNames((prev) => ({ ...prev, [run.name]: prev[run.name] !== true })); }}
        type="button"
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="truncate text-[13px] font-medium leading-5">{run.name}</span>
          </div>
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-[#24b26b]" : "bg-brand-border"}`} />
        </div>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar
        locationLabel="compare"
        ownerLabel={handle}
        ownerHref={`/${handle}`}
        parentLabel={projectName}
        parentHref={`/${handle}/${projectName}`}
      />
      <div className="flex-1 lg:grid lg:grid-cols-[280px_1fr]">
        {!showProjectNotFound ? (
          <aside className="flex h-full flex-col border-b border-brand-border bg-[#f0f6f7] px-4 py-4 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-textMuted">Runs</h2>
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] text-brand-textMuted">{projectRuns.length}</span>
            </div>
            <div className="mb-3 flex gap-2">
              <button
                className="flex-1 rounded-md border border-brand-border bg-brand-surface px-2 py-1.5 text-[11px] font-semibold text-brand-text"
                onClick={() => { setHiddenRunNames({}); }}
                type="button"
              >
                Show all
              </button>
              <button
                className="flex-1 rounded-md border border-brand-border bg-brand-surface px-2 py-1.5 text-[11px] font-semibold text-brand-text"
                onClick={() => { setHiddenRunNames(Object.fromEntries(projectRuns.map((run) => [run.name, true]))); }}
                type="button"
              >
                Hide all
              </button>
            </div>
            <div className="-mx-4 border-y border-brand-border/70 lg:-mx-5">
              {projectRuns.length === 0 && !isRunsLoading ? <div className="px-4 py-2 text-[13px] text-brand-textMuted lg:px-5">No runs yet.</div> : null}
              {projectRuns.map(renderRunItem)}
            </div>
          </aside>
        ) : null}

        <main className="p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{handle}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm">
                <Link className="text-brand-textMuted no-underline transition hover:text-brand-text" href={`/${handle}/${projectName}`}>
                  {projectName}
                </Link>
                <span className="text-brand-textMuted">/</span>
                <span className="font-semibold text-brand-text">compare</span>
              </div>
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2 text-sm text-brand-textMuted">
              plotting {visibleRuns.length} / {projectRuns.length} runs
            </div>
          </header>

          {showProjectNotFound ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
          {runError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{runError}</div> : null}
          {scalarError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{scalarError}</div> : null}
          {!showProjectNotFound ? (
            <section className="lg:py-1">
              {isRunsLoading || isScalarsLoading ? <div className="mb-4 text-[13px] text-brand-textMuted">Loading charts...</div> : null}
              {visibleRuns.length === 0 ? <div className="mb-4 text-[13px] text-brand-textMuted">Select at least one run to view charts.</div> : null}
              {sections.map(({ prefix, charts }) => (
                <section className="mb-6 last:mb-0" key={prefix}>
                  <header className="mb-3 flex items-center justify-between gap-2">
                    <button
                      className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-brand-textMuted"
                      type="button"
                      onClick={() => { setCollapsedSections((prev) => ({ ...prev, [prefix]: !(prev[prefix] ?? false) })); }}
                    >
                      <span className={`transition-transform ${collapsedSections[prefix] ? "-rotate-90" : "rotate-0"}`}>
                        <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                          <path d="M4 6.25 8 10l4-3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                        </svg>
                      </span>
                      <span>{prefix}</span>
                      <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] font-semibold text-brand-textMuted">
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
              {!isScalarsLoading && sections.length === 0 ? <div className="text-[13px] text-brand-textMuted">No scalar data yet.</div> : null}
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
