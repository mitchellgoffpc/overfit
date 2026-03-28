import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";

import { getSeriesPoints, groupChartsByPrefix } from "charts/helpers";
import { colors } from "colors";
import ChartSections from "components/charts/ChartSections";
import CollapsibleSection from "components/CollapsibleSection";
import MediaPreview from "components/MediaPreview";
import SectionHeader from "components/SectionHeader";
import StepSlider from "components/StepSlider";
import { getMediaFileUrl, useMediaStore } from "stores/media";
import { useRunStore } from "stores/runs";
import { useScalarStore } from "stores/scalars";
import type { Media } from "types";

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

  const chartSeries = useMemo(() => {
    const keys = new Set<string>(scalars.flatMap((scalar) => Object.keys(scalar.values)));
    const runColor = colors.brand.accent;
    return Array.from(keys).sort().map((key) => ({
      id: key,
      series: [{ id: key, label: runName, points: getSeriesPoints(scalars, key), color: runColor, lineWidth: 2 }]
    }));
  }, [runName, scalars]);

  const hasPoints = chartSeries.some((item) => item.series.some((s) => s.points.length > 0));
  const sections = useMemo(() => groupChartsByPrefix(chartSeries), [chartSeries]);

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
    const caption = item.metadata && "caption" in item.metadata ? String(item.metadata["caption"]) : undefined;
    return (
      <div key={`${item.id}-${String(index)}`}>
        <MediaPreview type={item.type} src={url} alt={item.key} caption={caption} />
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
      <ChartSections sections={sections} hasPoints={hasPoints} isLoading={isScalarsLoading} />
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
