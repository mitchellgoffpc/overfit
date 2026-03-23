import type { Media } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import { getClosestPoint, xFormatter, yFormatter } from "charts/helpers";
import type { LineSeries } from "charts/lineChart";
import type { LineChartHover } from "components/charts/LineChart";
import LineChart from "components/charts/LineChart";
import CollapsibleSection from "components/CollapsibleSection";
import SectionHeader from "components/SectionHeader";
import StepSlider from "components/StepSlider";
import { RULED_LINE_HEIGHT } from "helpers";
import { colors } from "lib/colors";
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
    const runColor = colors.brand.accent;
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
    const label = series.id;
    const hovered = hoveredSections[prefix] ?? null;
    const closest = hovered ? getClosestPoint(series, hovered.step) : null;
    const isLeft = (hovered?.xRatio ?? 0) < 0.5;
    const tooltipStyle = !hovered ? undefined
      : { left: `${String(hovered.cursorX)}px`, top: "0.5rem", transform: isLeft ? "translateX(0.75rem)" : "translateX(calc(-100% - 0.75rem))" };

    return (
      <div
        className="relative flex flex-col rounded-xl border border-brand-border bg-brand-surface px-2 pb-1.5 pt-2 shadow-soft"
        style={{ height: `${String(9 * RULED_LINE_HEIGHT)}rem` }}
        key={series.id}
      >
        <div className="mb-1 flex flex-col items-center gap-0">
          <h2 className="text-[0.8125rem] font-semibold text-brand-text">{label}</h2>
          <div className="flex items-center gap-2 text-[0.6875rem] text-brand-textMuted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
            <span className="max-w-40 truncate">{runName}</span>
          </div>
        </div>
        {!hasPoints && !isScalarsLoading ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">No scalar data yet.</div> : null}
        <div className="relative min-h-0 flex-1">
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
            className="h-full w-full"
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

  const renderMediaFile = (item: Media, index: number) => {
    const url = getMediaFileUrl(handle, projectName, runName, item.id, index);
    return (
      <div key={`${item.id}-${String(index)}`}>
        {item.type === "image" ? (
          <img src={url} alt={item.key} className="w-full rounded-lg" />
        ) : item.type === "video" ? (
          <video src={url} controls className="w-full rounded-lg" />
        ) : (
          <audio src={url} controls className="w-full" />
        )}
        {item.metadata && "caption" in item.metadata ? (
          <p className="mt-1.5 text-center text-[0.75rem] text-brand-textMuted">{String(item.metadata["caption"])}</p>
        ) : null}
      </div>
    );
  };

  const renderMediaGroup = (key: string, items: Media[], steps: number[]) => {
    const selectedStep = mediaSteps[key] ?? steps[steps.length - 1] ?? 0;
    const visible = items.filter((m) => m.step === selectedStep);
    const isMultiFile = items.some((m) => m.count > 1);

    if (isMultiFile) {
      return (
        <div className="flex h-[18.5rem] flex-col rounded-xl border border-brand-border bg-brand-surface px-4 pb-3 pt-3 shadow-soft" key={key}>
          <h3 className="mb-2 text-center text-[0.8125rem] font-semibold text-brand-text">{key}</h3>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              {visible.flatMap((item) => Array.from({ length: item.count }, (_, i) => renderMediaFile(item, i)))}
            </div>
          </div>
          {steps.length > 1 ? (
            <div className="mt-3 flex shrink-0 justify-center border-t border-brand-border pt-3">
              <StepSlider steps={steps} value={selectedStep} onChange={(step) => { setMediaSteps((prev) => ({ ...prev, [key]: step })); }} />
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <CollapsibleSection
        key={key}
        label={key}
        count={items.length}
        collapsed={collapsedSections[`media:${key}`] ?? false}
        onToggle={() => { setCollapsedSections((prev) => ({ ...prev, [`media:${key}`]: !(prev[`media:${key}`] ?? false) })); }}
        trailing={steps.length > 1
          ? <StepSlider steps={steps} value={selectedStep} onChange={(step) => { setMediaSteps((prev) => ({ ...prev, [key]: step })); }} />
          : undefined}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.flatMap((item) => Array.from({ length: item.count }, (_, i) => {
            return (
              <div className="rounded-xl border border-brand-border bg-brand-surface p-2 shadow-soft" key={`${item.id}-${String(i)}`}>
                {renderMediaFile(item, i)}
              </div>
            );
          }))}
        </div>
      </CollapsibleSection>
    );
  };

  return (
    <main className="relative px-[1.5rem] pb-[1.5rem]">
      <SectionHeader title="Scalar Plots" subtitle="training + validation metrics" />
      {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError ?? "Run not found."}</div> : null}
      {run && runError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div> : null}
      {scalarError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{scalarError}</div> : null}
      {sections.map(({ prefix, series }) => (
        <CollapsibleSection
          key={prefix}
          label={prefix}
          count={series.length}
          collapsed={collapsedSections[prefix] ?? false}
          onToggle={() => { setCollapsedSections((prev) => ({ ...prev, [prefix]: !(prev[prefix] ?? false) })); }}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" style={{ marginBottom: `${String(RULED_LINE_HEIGHT / 2)}rem` }}>
            {series.map((item) => renderSeries(prefix, item))}
          </div>
        </CollapsibleSection>
      ))}
      {mediaByKey.length > 0 ? (
        <>
          <SectionHeader title="Media" subtitle="logged images, video + audio" sectionLabel="Section B" numLines={0} />
          {mediaError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{mediaError}</div> : null}
          {mediaByKey.some(({ items }) => items.some((m) => m.count > 1)) ? (
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mediaByKey.filter(({ items }) => items.some((m) => m.count > 1)).map(({ key, items, steps }) => renderMediaGroup(key, items, steps))}
            </div>
          ) : null}
          {mediaByKey.filter(({ items }) => !items.some((m) => m.count > 1)).map(({ key, items, steps }) => renderMediaGroup(key, items, steps))}
        </>
      ) : null}
    </main>
  );
}
