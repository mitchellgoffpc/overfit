import { faBullseye, faEllipsisVertical, faEye, faPen, faThumbTack, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import { getSeriesPoints, groupChartsByPrefix } from "charts/helpers";
import { colors, getRunColor } from "colors";
import ChartSections from "components/charts/ChartSections";
import DropdownMenu from "components/DropdownMenu";
import MediaPreview from "components/MediaPreview";
import Modal from "components/Modal";
import NotebookShell from "components/NotebookShell";
import ProjectHeader from "components/project/ProjectHeader";
import SectionHeader from "components/SectionHeader";
import Slider from "components/Slider";
import { getRunStatus, RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { fetchMedia, getMediaFileUrl, useMediaStore } from "stores/media";
import { buildProjectKey, useProjectStore } from "stores/projects";
import { buildRunKey, deleteRun, fetchRuns, getProjectRuns, pinRun, setBaselineRun, useRunStore } from "stores/runs";
import { fetchScalars, useScalarStore } from "stores/scalars";
import type { Run } from "types";

export default function ProjectCompareRoute(): ReactElement {
  const { handle, projectName } = useParams<{ handle: string; projectName: string }>();
  const projectKey = buildProjectKey(handle, projectName);
  const project = useProjectStore((state) => state.projects[projectKey]);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const runError = useRunStore((state) => state.errors[projectKey] ?? null);
  const isRunsLoading = useRunStore((state) => state.isLoading[projectKey] ?? false);
  const projectRuns = useRunStore(useShallow(getProjectRuns(project?.id ?? "")));
  const scalars = useScalarStore((state) => state.scalars);
  const isScalarsLoading = useScalarStore((state) => Object.values(state.isLoading).some(Boolean));
  const scalarError = useScalarStore((state) => Object.values(state.errors).find(Boolean) ?? null);
  const media = useMediaStore((state) => state.media);
  const [hiddenRunNames, setHiddenRunNames] = useState<Record<string, boolean>>({});
  const [mediaSteps, setMediaSteps] = useState<Record<string, number>>({});
  const [mediaIndexes, setMediaIndexes] = useState<Record<string, number>>({});
  const [openMenuRunId, setOpenMenuRunId] = useState<string | null>(null);
  const [renameRun, setRenameRun] = useState<Run | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [runActionError, setRunActionError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuns(handle, projectName);
  }, [handle, projectName]);
  const showProjectNotFound = !project && !isProjectsLoading;

  useEffect(() => {
    for (const run of projectRuns) {
      void fetchScalars(handle, projectName, run.name);
      void fetchMedia(handle, projectName, run.name);
    }
  }, [handle, projectName, projectRuns]);

  const colorByRunId = useMemo(() => new Map(projectRuns.map((run) => [run.id, getRunColor(run.id)])), [projectRuns]);
  const visibleRuns = useMemo(() => projectRuns.filter((run) => hiddenRunNames[run.name] !== true), [hiddenRunNames, projectRuns]);
  const runningCount = useMemo(() => projectRuns.filter((run) => getRunStatus(run) === "running").length, [projectRuns]);
  const failedCount = useMemo(() => projectRuns.filter((run) => getRunStatus(run) === "failed").length, [projectRuns]);

  const chartSeries = useMemo(() => {
    const metricKeys = new Set<string>();
    for (const run of visibleRuns) {
      const runScalars = scalars[buildRunKey(handle, projectName, run.name)];
      if (!runScalars) { continue; }
      for (const metric of Object.keys(runScalars.series)) { metricKeys.add(metric); }
    }

    return Array.from(metricKeys).sort().map((metric) => ({
      id: metric,
      series: visibleRuns.map((run) => ({
        id: `${metric}:${run.name}`,
        label: run.name,
        points: getSeriesPoints(scalars[buildRunKey(handle, projectName, run.name)] ?? null, metric),
        color: colorByRunId.get(run.id) ?? colors.brand.accent,
        lineWidth: 2
      }))
    }));
  }, [colorByRunId, handle, projectName, scalars, visibleRuns]);

  const sections = useMemo(() => groupChartsByPrefix(chartSeries), [chartSeries]);
  const hasLoadedScalarData = useMemo(
    () => visibleRuns.some((run) => Object.keys(scalars[buildRunKey(handle, projectName, run.name)]?.series ?? {}).length > 0),
    [handle, projectName, scalars, visibleRuns]
  );

  const mediaKeys = useMemo(() => {
    const keySet = new Map<string, { steps: Set<number>; maxCount: number }>();
    for (const run of visibleRuns) {
      for (const item of media[buildRunKey(handle, projectName, run.name)] ?? []) {
        const entry = keySet.get(item.key) ?? { steps: new Set<number>(), maxCount: 0 };
        if (item.step !== null) { entry.steps.add(item.step); }
        entry.maxCount = Math.max(entry.maxCount, item.count);
        keySet.set(item.key, entry);
      }
    }
    return Array.from(keySet.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, { steps, maxCount }]) => ({
      key, steps: [...steps].sort((a, b) => a - b), maxCount
    }));
  }, [handle, projectName, media, visibleRuns]);

  const hasPoints = useMemo(() => chartSeries.some((item) => item.series.some((s) => s.points.length > 0)), [chartSeries]);

  const openRenameModal = (run: Run) => {
    setOpenMenuRunId(null);
    setRenameRun(run);
    setRenameValue(run.name);
  };

  const closeRenameModal = () => {
    setRenameRun(null);
    setRenameValue("");
  };

  const runAction = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>) => {
    setOpenMenuRunId(null);
    setRunActionError(null);
    const result = await action();
    if (!result.ok) { setRunActionError(result.error); }
  };

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
            const items = (media[buildRunKey(handle, projectName, run.name)] ?? []).filter((m) => m.key === key && m.step === selectedStep);
            const item = items[0];
            const color = colorByRunId.get(run.id) ?? colors.brand.accent;
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

  const renderRunItem = (run: Run) => {
    const isVisible = hiddenRunNames[run.name] !== true;
    const color = colorByRunId.get(run.id) ?? colors.brand.accent;
    const isActive = getRunStatus(run) === "running";
    return (
      <div
        className={[
          "relative flex w-full items-center justify-between text-left transition",
          isVisible ? "bg-transparent hover:bg-white/35" : "bg-transparent opacity-60"
        ].join(" ")}
        key={run.id}
        style={{ height: RULED_LINE }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => { setHiddenRunNames((prev) => ({ ...prev, [run.name]: prev[run.name] !== true })); }}
          type="button"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {run.isPinned ? <FontAwesomeIcon icon={faThumbTack} className="text-[0.75rem] text-brand-textMuted" /> : null}
          {run.isBaseline ? <FontAwesomeIcon icon={faBullseye} className="text-[0.75rem] text-brand-textMuted" /> : null}
          <span className="truncate text-[0.75rem] font-semibold leading-5">{run.name}</span>
        </button>
        <div className="ml-2 flex items-center gap-1.5 text-[0.75rem] text-brand-textMuted">
          {isActive ? <span className="h-2 w-2 rounded-full bg-signal-running" /> : null}
          <DropdownMenu
            open={openMenuRunId === run.id}
            onOpenChange={(open) => { setOpenMenuRunId(open ? run.id : null); }}
            className="relative"
            menuClassName={"absolute right-0 top-[1.625rem] z-20 w-40 overflow-hidden rounded-lg border border-brand-borderMuted bg-white py-1"
              + " text-[0.75rem] shadow-[0_0.75rem_1.75rem_rgba(23,43,43,0.14)]"}
            itemClassName="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-brand-surface"
            sections={[{ items: [
              { label: "View run", href: `/${handle}/${projectName}/runs/${run.name}`, icon: faEye },
              {
                label: run.isPinned ? "Unpin run" : "Pin run",
                icon: faThumbTack,
                onSelect: () => { void runAction(async () => await pinRun(handle, projectName, run.name, !run.isPinned)); }
              },
              {
                label: "Set baseline",
                icon: faBullseye,
                onSelect: () => { void runAction(async () => await setBaselineRun(handle, projectName, run.name)); }
              },
              { label: "Rename run", icon: faPen, onSelect: () => { openRenameModal(run); } },
              {
                label: "Delete run",
                icon: faTrash,
                destructive: true,
                onSelect: () => { void runAction(async () => await deleteRun(handle, projectName, run.name)); }
              }
            ] }]}
            trigger={(
              <button
                aria-label={`Open actions for ${run.name}`}
                aria-haspopup="menu"
                aria-expanded={openMenuRunId === run.id}
                className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-white hover:text-brand-text"
                onClick={() => { setOpenMenuRunId(openMenuRunId === run.id ? null : run.id); }}
                type="button"
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>
            )}
          />
        </div>
      </div>
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

              <div className="pt-5" style={{ height: `${String(RULED_LINE_HEIGHT * 4)}rem` }}>
                <div className="rounded-xl border border-brand-borderMuted bg-white/85 px-3 py-3">
                  <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Overview</p>
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
              </div>
            </div>

            <div className="grid" style={{ marginTop: RULED_LINE }}>
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
          {runActionError ? <div className="mb-4 py-3 text-[0.8125rem] text-signal-failed">{runActionError}</div> : null}
          {scalarError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{scalarError}</div> : null}
          {!showProjectNotFound ? (
            <section style={{ marginTop: RULED_LINE }}>
              {(isRunsLoading || isScalarsLoading) && !hasLoadedScalarData
                ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">Loading charts...</div>
                : null}
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
          <Modal open={renameRun !== null} onClose={closeRenameModal}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                closeRenameModal();
              }}
            >
              <h2 className="text-base font-semibold text-brand-text">Rename run</h2>
              <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Run rename is not supported by the API yet. Saving will close this dialog.</p>
              <label className="mt-4 block text-[0.75rem] font-semibold text-brand-text" htmlFor="rename-run-name">Run name</label>
              <input
                id="rename-run-name"
                className={"mt-1 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-[0.8125rem] text-brand-text outline-none"
                  + " transition focus:border-brand-borderStrong"}
                onChange={(event) => { setRenameValue(event.target.value); }}
                value={renameValue}
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  className={"rounded-lg border border-brand-borderMuted bg-white px-3 py-2 text-[0.75rem] font-semibold text-brand-text"
                    + " transition hover:bg-brand-surface"}
                  onClick={closeRenameModal}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={"rounded-lg border border-brand-borderStrong bg-hover px-3 py-2 text-[0.75rem] font-semibold text-brand-text"
                    + " transition hover:bg-white"}
                  type="submit"
                >
                  Save
                </button>
              </div>
            </form>
          </Modal>
        </main>
    </NotebookShell>
  );
}
