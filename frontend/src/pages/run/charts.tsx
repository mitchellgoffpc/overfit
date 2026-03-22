import type { Media } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import { getClosestPoint, xFormatter, yFormatter } from "charts/helpers";
import type { LineSeries } from "charts/lineChart";
import type { LineChartHover } from "components/charts/LineChart";
import LineChart from "components/charts/LineChart";
import SectionHeader from "components/SectionHeader";
import StepSlider from "components/StepSlider";
import { getMediaFileUrl, useMediaStore } from "stores/media";
import { useRunStore } from "stores/runs";
import { useScalarStore } from "stores/scalars";

const tooltipClass = "pointer-events-none absolute z-10 max-w-60 rounded-[0.625rem] border border-brand-border"
  + " bg-brand-surface/96 px-3 py-2 shadow-soft backdrop-blur";

export default function RunChartsPage(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const run = useRunStore((state) => state.runsByKey[`${handle}/${projectName}/${runName}`]);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const scalars = useScalarStore((state) => state.scalars);
  const scalarError = useScalarStore((state) => state.error);
  const isScalarsLoading = useScalarStore((state) => state.isLoading);
  const fetchScalars = useScalarStore((state) => state.fetchScalars);
  const media = useMediaStore((state) => state.media);
  const mediaError = useMediaStore((state) => state.error);
  const fetchMedia = useMediaStore((state) => state.fetchMedia);

  useEffect(() => {
    void fetchScalars(handle, projectName, runName);
    void fetchMedia(handle, projectName, runName);
  }, [fetchScalars, fetchMedia, handle, projectName, runName]);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [mediaSteps, setMediaSteps] = useState<Record<string, number>>({});
  const [hoveredSections, setHoveredSections] = useState<Record<string, LineChartHover | null>>({});

  const chartSeries = useMemo(() => {
    const keys = new Set<string>(scalars.flatMap((scalar) => Object.keys(scalar.values)));
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
      const [firstSegment] = series.id.split("/");
      const prefix = series.id.includes("/") ? (firstSegment ?? "other") : "other";
      const list = buckets.get(prefix) ?? [];
      list.push(series);
      buckets.set(prefix, list);
    });
    return Array.from(buckets.keys()).sort().flatMap((prefix) => {
      const list = buckets.get(prefix);
      if (!list || list.length === 0) { return []; }
      return [{ prefix, series: list }];
    });
  }, [chartSeries]);

  const onChartHover = (prefix: string, hover: LineChartHover | null) => {
    setHoveredSections((prev) => {
      const current = prev[prefix] ?? null;
      if (!hover && !current) { return prev; }
      if (hover?.step === current?.step) { return prev; }
      return { ...prev, [prefix]: hover };
    });
  };

  const renderSeries = (prefix: string, series: LineSeries) => {
    const label = series.id.includes("/") ? series.id.split("/").slice(1).join("/") : series.id;
    const hovered = hoveredSections[prefix] ?? null;
    const closest = hovered ? getClosestPoint(series, hovered.step) : null;
    const isLeft = (hovered?.xRatio ?? 0) < 0.5;
    const tooltipStyle = !hovered ? undefined
      : { left: `${String(hovered.cursorX)}px`, top: "0.5rem", transform: isLeft ? "translateX(0.75rem)" : "translateX(calc(-100% - 0.75rem))" };

    return (
      <div className="relative rounded-xl border border-brand-border bg-brand-surface px-2 pb-1.5 pt-2 shadow-soft" key={series.id}>
        <div className="mb-1 flex flex-col items-center gap-0">
          <h2 className="text-[0.8125rem] font-semibold text-brand-text">{label}</h2>
          <div className="flex items-center gap-2 text-[0.6875rem] text-brand-textMuted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
            <span className="max-w-40 truncate">{runName}</span>
          </div>
        </div>
        {!hasPoints && !isScalarsLoading ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">No scalar data yet.</div> : null}
        <div className="relative">
          {hovered && closest ? (
            <div className={tooltipClass} style={tooltipStyle}>
              <div className="flex items-center justify-between gap-3 text-[0.75rem] text-brand-text">
                <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                  <span className="truncate">{label}</span>
                  <span className="text-brand-textMuted">step {xFormatter(hovered.step)}</span>
                </div>
                <span className="font-semibold">{yFormatter(closest.y)}</span>
              </div>
            </div>
          ) : null}
          <LineChart
            className="h-[13.75rem] w-full"
            series={series.points.length > 0 ? [series] : []}
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

  const mediaByKey = useMemo(() => {
    const buckets = new Map<string, Media[]>();
    media.forEach((item) => {
      const list = buckets.get(item.key) ?? [];
      list.push(item);
      buckets.set(item.key, list);
    });
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => {
      const steps = [...new Set(items.filter((m) => m.step !== null).map((m) => m.step!))].sort((a, b) => a - b);
      return { key, items, steps };
    });
  }, [media]);

  const renderMediaGroup = (key: string, items: Media[], steps: number[]) => {
    const selectedStep = mediaSteps[key] ?? steps[steps.length - 1] ?? 0;
    const visible = items.filter((m) => m.step === selectedStep);

    return (
      <section className="mb-6 last:mb-0" key={key}>
        <header className="mb-3 flex items-center justify-between gap-2">
          <button
            className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-brand-textMuted"
            type="button"
            onClick={() => { setCollapsedSections((prev) => ({ ...prev, [`media:${key}`]: !(prev[`media:${key}`] ?? false) })); }}
          >
            <span className={`transition-transform ${collapsedSections[`media:${key}`] ? "-rotate-90" : "rotate-0"}`}>
              <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
                <path d="M4 6.25 8 10l4-3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
              </svg>
            </span>
            <span>{key}</span>
            <span className="rounded-full border border-brand-border px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-textMuted">
              {items.length}
            </span>
          </button>
          {steps.length > 1 && !collapsedSections[`media:${key}`] ? (
            <StepSlider steps={steps} value={selectedStep} onChange={(step) => { setMediaSteps((prev) => ({ ...prev, [key]: step })); }} />
          ) : null}
        </header>
        {collapsedSections[`media:${key}`] ? null : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <div className="rounded-xl border border-brand-border bg-brand-surface p-2 shadow-soft" key={item.id}>
                {item.type === "image" ? (
                  <img src={getMediaFileUrl(handle, projectName, runName, item.id)} alt={item.key} className="w-full rounded-lg" />
                ) : item.type === "video" ? (
                  <video src={getMediaFileUrl(handle, projectName, runName, item.id)} controls className="w-full rounded-lg" />
                ) : (
                  <audio src={getMediaFileUrl(handle, projectName, runName, item.id)} controls className="w-full" />
                )}
                {item.metadata && "caption" in item.metadata ? (
                  <p className="mt-1.5 text-center text-[0.75rem] text-brand-textMuted">{String(item.metadata["caption"])}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="relative p-[1.5rem]">
      <SectionHeader title="Scalar Plots" subtitle="training + validation metrics" />
      {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError ?? "Run not found."}</div> : null}
      {run && runError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div> : null}
      {scalarError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{scalarError}</div> : null}
      {sections.map(({ prefix, series }) => (
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
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[0.6875rem] font-semibold text-brand-textMuted">
                {series.length}
              </span>
            </button>
          </header>
          {collapsedSections[prefix] ? null : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {series.map((item) => renderSeries(prefix, item))}
            </div>
          )}
        </section>
      ))}
      {mediaByKey.length > 0 ? (
        <>
          <SectionHeader title="Media" subtitle="logged images, video + audio" sectionLabel="Section B" />
          {mediaError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{mediaError}</div> : null}
          {mediaByKey.map(({ key, items, steps }) => renderMediaGroup(key, items, steps))}
        </>
      ) : null}
    </main>
  );
}
