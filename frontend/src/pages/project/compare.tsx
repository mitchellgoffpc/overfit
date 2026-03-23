import type { Media, Run, Scalar } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import { getSeriesPoints, groupChartsByPrefix } from "charts/helpers";
import type { LineChartHover } from "components/charts/LineChart";
import MetricChartCard from "components/charts/MetricChartCard";
import CollapsibleSection from "components/CollapsibleSection";
import NotebookShell from "components/NotebookShell";
import ProjectHeader from "components/project/ProjectHeader";
import SectionHeader from "components/SectionHeader";
import StepSlider from "components/StepSlider";
import { formatRunTime, RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { colors, runPalette } from "lib/colors";
import { fetchRunMedia, getMediaFileUrl } from "stores/media";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";
import { fetchRunScalars } from "stores/scalars";

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
  const [mediaByRun, setMediaByRun] = useState<Record<string, Media[]>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [hoveredSections, setHoveredSections] = useState<Record<string, LineChartHover | null>>({});
  const [hiddenRunNames, setHiddenRunNames] = useState<Record<string, boolean>>({});
  const [mediaSteps, setMediaSteps] = useState<Record<string, number>>({});
  const [mediaIndexes, setMediaIndexes] = useState<Record<string, number>>({});

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (projectRuns.length === 0) { if (!cancelled) { setMediaByRun({}); } return; }
      const responses = await Promise.all(projectRuns.map(async (run) => ({ run, response: await fetchRunMedia(handle, projectName, run.name) })));
      if (cancelled) { return; }
      const next: Record<string, Media[]> = {};
      for (const { run, response } of responses) { next[run.name] = response.ok ? response.body : []; }
      setMediaByRun(next);
    };
    void load();
    return () => { cancelled = true; };
  }, [handle, projectName, projectRuns]);

  const colorByRunName = useMemo(
    () => new Map(projectRuns.map((run, index) => [run.name, runPalette[index % runPalette.length] ?? colors.brand.accent])),
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
        label: run.name,
        points: getSeriesPoints(scalarsByRun[run.name] ?? [], metric),
        color: colorByRunName.get(run.name) ?? runPalette[index % runPalette.length] ?? colors.brand.accent,
        lineWidth: 2
      }))
    }));
  }, [colorByRunName, scalarsByRun, visibleRuns]);

  const sections = useMemo(() => groupChartsByPrefix(chartSeries), [chartSeries]);

  const mediaKeys = useMemo(() => {
    const keySet = new Map<string, { steps: Set<number>; maxCount: number }>();
    for (const run of visibleRuns) {
      for (const item of mediaByRun[run.name] ?? []) {
        const entry = keySet.get(item.key) ?? { steps: new Set<number>(), maxCount: 0 };
        if (item.step !== null) { entry.steps.add(item.step); }
        entry.maxCount = Math.max(entry.maxCount, item.count);
        keySet.set(item.key, entry);
      }
    }
    return Array.from(keySet.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, { steps, maxCount }]) => ({
      key, steps: [...steps].sort((a, b) => a - b), maxCount
    }));
  }, [mediaByRun, visibleRuns]);

  const hasPoints = useMemo(() => chartSeries.some((item) => item.series.some((s) => s.points.length > 0)), [chartSeries]);

  const onChartHover = (prefix: string, hover: LineChartHover | null) => {
    setHoveredSections((prev) => {
      const current = prev[prefix] ?? null;
      if (!hover && !current) { return prev; }
      if (hover?.step === current?.step) { return prev; }
      return { ...prev, [prefix]: hover };
    });
  };

  const renderMediaComparison = (key: string, steps: number[], maxCount: number) => {
    const selectedStep = mediaSteps[key] ?? steps[steps.length - 1] ?? 0;
    const selectedIndex = mediaIndexes[key] ?? 0;

    return (
      <div className="rounded-[0.875rem] border border-brand-borderMuted bg-white/95 px-4 pb-4 pt-3 shadow-[0_0.5rem_1.25rem_rgba(23,43,43,0.06)]" key={key}>
        <h3 className="mb-2 text-center text-[0.8125rem] font-semibold text-brand-text">{key}</h3>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${String(visibleRuns.length)}, minmax(0, 1fr))` }}>
          {visibleRuns.map((run) => {
            const items = (mediaByRun[run.name] ?? []).filter((m) => m.key === key && m.step === selectedStep);
            const item = items[0];
            const color = colorByRunName.get(run.name) ?? colors.brand.accent;
            return (
              <div className="flex flex-col items-center gap-1.5" key={run.name}>
                <span className="text-[0.75rem] font-semibold" style={{ color }}>{run.name}</span>
                {item ? (
                  item.type === "image" ? (
                    <img src={getMediaFileUrl(handle, projectName, run.name, item.id, selectedIndex)} alt={key} className="w-full rounded-lg" />
                  ) : item.type === "video" ? (
                    <video src={getMediaFileUrl(handle, projectName, run.name, item.id, selectedIndex)} controls className="w-full rounded-lg" />
                  ) : (
                    <audio src={getMediaFileUrl(handle, projectName, run.name, item.id, selectedIndex)} controls className="w-full" />
                  )
                ) : (
                  <div className={"flex h-24 w-full items-center justify-center rounded-lg border border-dashed"
                    + " border-brand-border text-[0.75rem] text-brand-textMuted"}>
                    No media
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col items-center gap-2 border-t border-brand-borderMuted pt-3">
          {steps.length > 1 ? (
            <StepSlider steps={steps} value={selectedStep} onChange={(step) => { setMediaSteps((prev) => ({ ...prev, [key]: step })); }} />
          ) : null}
          {maxCount > 1 ? (
            <div className="flex items-center gap-3">
              <span className="text-[0.75rem] font-medium text-brand-textMuted">Index</span>
              <input
                type="range"
                min={0}
                max={maxCount - 1}
                value={selectedIndex}
                onChange={(e) => { setMediaIndexes((prev) => ({ ...prev, [key]: Number(e.target.value) })); }}
                className="h-1 w-24 cursor-pointer accent-brand-accent"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className={"flex h-6 w-6 items-center justify-center rounded border border-brand-border"
                    + " text-brand-textMuted hover:bg-brand-surfaceMuted disabled:opacity-40"}
                  disabled={selectedIndex <= 0}
                  onClick={() => { setMediaIndexes((prev) => ({ ...prev, [key]: (prev[key] ?? 0) - 1 })); }}
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M9 6H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <span className="min-w-[3rem] text-center text-[0.8125rem] tabular-nums text-brand-text">{selectedIndex}</span>
                <button
                  type="button"
                  className={"flex h-6 w-6 items-center justify-center rounded border border-brand-border"
                    + " text-brand-textMuted hover:bg-brand-surfaceMuted disabled:opacity-40"}
                  disabled={selectedIndex >= maxCount - 1}
                  onClick={() => { setMediaIndexes((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 })); }}
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M6 3v6M9 6H3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const renderRunItem = (run: Run, index: number) => {
    const isVisible = hiddenRunNames[run.name] !== true;
    const color = runPalette[index % runPalette.length] ?? colors.brand.accent;
    const isActive = run.status === "running";
    return (
      <button
        className={[
          "relative flex w-full items-center justify-between text-left transition",
          isVisible ? "bg-transparent hover:bg-white/35" : "bg-transparent opacity-60"
        ].join(" ")}
        key={run.id}
        onClick={() => { setHiddenRunNames((prev) => ({ ...prev, [run.name]: prev[run.name] !== true })); }}
        style={{ height: RULED_LINE }}
        type="button"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-[0.75rem] font-semibold leading-5">{run.name}</span>
        </div>
        <div className="ml-2 flex items-center gap-2 text-[0.625rem] text-brand-textMuted">
          <span>{formatRunTime(run.createdAt)}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-signal-running" : "bg-brand-border"}`} />
        </div>
      </button>
    );
  };

  return (
    <NotebookShell columns="18.25rem 1fr" maxWidth="calc(100% - 5rem)">
        {!showProjectNotFound ? (
          <aside
            className="relative border-b border-brand-borderMuted px-5 pb-5 lg:border-b-0 lg:border-r lg:pl-14 lg:pr-5 lg:pb-6"
            style={{ paddingTop: `calc(${String(RULED_LINE_HEIGHT)}rem + 1px)` }}
          >
            <div>
              <ProjectHeader handle={handle} projectName={projectName} />

              <div className="pt-4" style={{ height: `${String(RULED_LINE_HEIGHT * 6)}rem` }}>
                <div className="rounded-xl border border-brand-borderMuted bg-white/85 px-3 py-3">
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Run Ledger</p>
                  <div className="mt-2 flex items-center justify-between text-[0.75rem]">
                    <span className="text-brand-textMuted">total</span>
                    <span className="font-semibold">{projectRuns.length}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[0.75rem]">
                    <span className="text-brand-textMuted">running</span>
                    <span className="font-semibold text-signal-accent">{runningCount}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[0.75rem]">
                    <span className="text-brand-textMuted">failed</span>
                    <span className="font-semibold text-signal-failed">{failedCount}</span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    className={"flex-1 rounded-lg border border-brand-borderStrong bg-hover px-2 py-1.5"
                      + " text-[0.6875rem] font-semibold text-brand-text transition hover:bg-white"}
                    onClick={() => { setHiddenRunNames({}); }}
                    type="button"
                  >
                    Show all
                  </button>
                  <button
                    className={"flex-1 rounded-lg border border-brand-borderMuted bg-white/80 px-2 py-1.5"
                      + " text-[0.6875rem] font-semibold text-brand-text transition hover:bg-white"}
                    onClick={() => { setHiddenRunNames(Object.fromEntries(projectRuns.map((run) => [run.name, true]))); }}
                    type="button"
                  >
                    Hide all
                  </button>
                </div>
              </div>
            </div>

            <div className="grid">
              {projectRuns.length === 0 && !isRunsLoading ? <div className="py-1 text-[0.8125rem] text-brand-textMuted">No runs yet.</div> : null}
              {projectRuns.map(renderRunItem)}
            </div>
          </aside>
        ) : null}

        <main className="relative px-[1.5rem] pb-[1.5rem]">
          <SectionHeader
            title="Scalar Plots"
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
              {sections.map(({ prefix, charts }) => (
                <CollapsibleSection
                  key={prefix}
                  label={prefix}
                  count={charts.length}
                  collapsed={collapsedSections[prefix] ?? false}
                  onToggle={() => { setCollapsedSections((prev) => ({ ...prev, [prefix]: !(prev[prefix] ?? false) })); }}
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ marginBottom: `${String(RULED_LINE_HEIGHT / 2)}rem` }}>
                    {charts.map((item) => (
                      <MetricChartCard
                        key={item.id}
                        metric={item.id}
                        series={item.series}
                        hovered={hoveredSections[prefix] ?? null}
                        onHover={(hover) => { onChartHover(prefix, hover); }}
                        hasPoints={hasPoints}
                        isLoading={isScalarsLoading}
                      />
                    ))}
                  </div>
                </CollapsibleSection>
              ))}
              {!isScalarsLoading && sections.length === 0 ? <div className="text-[0.8125rem] text-brand-textMuted">No scalar data yet.</div> : null}
            </section>
          ) : null}
          {mediaKeys.length > 0 ? (
            <section>
              <SectionHeader title="Media" subtitle={`comparing across ${String(visibleRuns.length)} runs`} sectionLabel="Section E" numLines={0} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {mediaKeys.map(({ key, steps, maxCount }) => renderMediaComparison(key, steps, maxCount))}
              </div>
            </section>
          ) : null}
        </main>
      </NotebookShell>
  );
}
