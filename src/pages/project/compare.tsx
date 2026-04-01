import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import { getSeriesPoints, groupChartsByPrefix } from "charts/helpers";
import { colors, getRunColor } from "colors";
import ChartSections from "components/charts/ChartSections";
import MediaPreview from "components/MediaPreview";
import NotebookShell from "components/NotebookShell";
import ProjectHeader from "components/project/ProjectHeader";
import SectionHeader from "components/SectionHeader";
import Slider from "components/Slider";
import { formatRunTime, RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { fetchMultiRunMedia, getMediaFileUrl } from "stores/media";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";
import { fetchMultiRunScalars } from "stores/scalars";
import type { Media, Run, Scalar } from "types";

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
    const runNames = projectRuns.map((r) => r.name);
    const load = async () => {
      if (runNames.length === 0) { setScalarsByRun({}); setIsScalarsLoading(false); setScalarError(null); return; }
      setIsScalarsLoading(true);
      setScalarError(null);
      const result = await fetchMultiRunScalars(handle, projectName, runNames);
      if (cancelled) { return; }
      setScalarsByRun(result.scalarsByRun);
      setScalarError(result.error);
      setIsScalarsLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [handle, projectName, projectRuns]);

  useEffect(() => {
    let cancelled = false;
    const runNames = projectRuns.map((r) => r.name);
    const load = async () => {
      if (runNames.length === 0) { setMediaByRun({}); return; }
      const result = await fetchMultiRunMedia(handle, projectName, runNames);
      if (cancelled) { return; }
      setMediaByRun(result);
    };
    void load();
    return () => { cancelled = true; };
  }, [handle, projectName, projectRuns]);

  const colorByRunName = useMemo(
    () => new Map(projectRuns.map((run, index) => [run.name, getRunColor(index)])),
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
        color: colorByRunName.get(run.name) ?? getRunColor(index),
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

  const renderMediaComparison = (key: string, steps: number[], maxCount: number) => {
    const selectedStep = mediaSteps[key] ?? steps[steps.length - 1] ?? 0;
    const selectedIndex = mediaIndexes[key] ?? 0;
    const indexes = Array.from({ length: maxCount }, (_, i) => i);

    return (
      <div
        className="flex flex-col rounded-[0.875rem] border border-brand-borderMuted bg-white/95 px-4 pb-4 pt-3 shadow-[0_0.5rem_1.25rem_rgba(23,43,43,0.06)]"
        style={{ height: `${String(9 * RULED_LINE_HEIGHT)}rem` }}
        key={key}
      >
        <h3 className="mb-2 shrink-0 text-center text-[0.8125rem] font-semibold text-brand-text">{key}</h3>
        <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${String(visibleRuns.length)}, minmax(0, 1fr))` }}>
          {visibleRuns.map((run) => {
            const items = (mediaByRun[run.name] ?? []).filter((m) => m.key === key && m.step === selectedStep);
            const item = items[0];
            const color = colorByRunName.get(run.name) ?? colors.brand.accent;
            return (
              <div className="flex min-h-0 min-w-0 flex-col items-center gap-1.5" key={run.name}>
                <span className="w-full truncate text-center text-[0.75rem] font-semibold" style={{ color }} title={run.name}>{run.name}</span>
                {item ? (
                  <div className="min-h-0 w-full flex-1 overflow-hidden rounded-lg">
                    <MediaPreview
                      type={item.type}
                      src={getMediaFileUrl(handle, projectName, run.name, item.id, selectedIndex)}
                      alt={key}
                      mediaClassName={item.type === "audio" ? "" : "h-full object-contain"}
                    />
                  </div>
                ) : (
                  <div className={"flex min-h-0 w-full flex-1 items-center justify-center rounded-lg border border-dashed"
                    + " border-brand-border text-[0.75rem] text-brand-textMuted"}>
                    No media
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex shrink-0 flex-col items-center gap-2 border-t border-brand-borderMuted pt-3">
          {steps.length > 1 ? (
            <Slider steps={steps} value={selectedStep} onChange={(step) => { setMediaSteps((prev) => ({ ...prev, [key]: step })); }} />
          ) : null}
          {maxCount > 1 ? (
            <Slider label="Index" steps={indexes} value={selectedIndex} onChange={(index) => { setMediaIndexes((prev) => ({ ...prev, [key]: index })); }} />
          ) : null}
        </div>
      </div>
    );
  };

  const renderRunItem = (run: Run, index: number) => {
    const isVisible = hiddenRunNames[run.name] !== true;
    const color = getRunColor(index);
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
    <NotebookShell columns="18.25rem 1fr" className="max-w-full md:max-w-[calc(100%-5rem)]">
        {!showProjectNotFound ? (
          <aside
            className="relative border-brand-borderMuted pb-0 px-4 lg:border-r lg:pb-6 lg:pr-5"
            style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}
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

        <main className="relative pb-[1.5rem] px-4 lg:px-[1.5rem]">
          <SectionHeader
            title="Charts"
            subtitle={`comparing ${String(visibleRuns.length)} / ${String(projectRuns.length)} runs`}
            sectionLabel="Section B"
          />

          {showProjectNotFound ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{projectError ?? "Project not found."}</div> : null}
          {runError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div> : null}
          {scalarError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{scalarError}</div> : null}
          {!showProjectNotFound ? (
            <section style={{ marginTop: RULED_LINE }}>
              {isRunsLoading || isScalarsLoading ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">Loading charts...</div> : null}
              {visibleRuns.length === 0 ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">Select at least one run to view charts.</div> : null}
              <ChartSections sections={sections} hasPoints={hasPoints} isLoading={isScalarsLoading} />
              {!isScalarsLoading && sections.length === 0 ? <div className="text-[0.8125rem] text-brand-textMuted">No scalar data yet.</div> : null}
            </section>
          ) : null}
          {mediaKeys.length > 0 ? (
            <section>
              <SectionHeader title="Media" subtitle={`comparing ${String(visibleRuns.length)} / ${String(projectRuns.length)} runs`} sectionLabel="Section C" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ marginTop: RULED_LINE }}>
                {mediaKeys.map(({ key, steps, maxCount }) => renderMediaComparison(key, steps, maxCount))}
              </div>
            </section>
          ) : null}
        </main>
      </NotebookShell>
  );
}
