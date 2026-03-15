import type { Scalar } from "@underfit/types";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";

import type { LineChartHover } from "components/charts/LineChart";
import LineChart from "components/charts/LineChart";

const tooltipClass = "pointer-events-none absolute z-10 max-w-[240px] rounded-[10px] border border-brand-border"
  + " bg-brand-surface/96 px-3 py-2 shadow-soft backdrop-blur";

interface ChartSeries {
  readonly id: string;
  readonly points: { x: number; y: number }[];
  readonly color: string;
  readonly lineWidth: number;
}

interface ChartsTabProps {
  readonly scalars: Scalar[];
  readonly runName: string;
  readonly isLoading: boolean;
}

const xFormatter = (value: number) => value.toFixed(0);
const yFormatter = (value: number) => value.toFixed(2);

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

export default function ChartsTab({ scalars, runName, isLoading }: ChartsTabProps): ReactElement {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
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

  const renderSeries = (prefix: string, series: ChartSeries) => {
    const label = series.id.includes("/") ? series.id.split("/").slice(1).join("/") : series.id;
    const hovered = hoveredSections[prefix] ?? null;
    const closest = hovered ? getClosestPoint(series, hovered.step) : null;
    const isLeft = (hovered?.xRatio ?? 0) < 0.5;
    const tooltipStyle = !hovered ? undefined
      : { left: `${String(hovered.cursorX)}px`, top: "8px", transform: isLeft ? "translateX(12px)" : "translateX(calc(-100% - 12px))" };

    return (
      <div className="relative rounded-[12px] border border-brand-border bg-brand-surface px-2 pb-[6px] pt-2 shadow-soft" key={series.id}>
        <div className="mb-1 flex flex-col items-center gap-0">
          <h2 className="text-[13px] font-semibold text-brand-text">{label}</h2>
          <div className="flex items-center gap-2 text-[11px] text-brand-textMuted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
            <span className="max-w-[160px] truncate">{runName}</span>
          </div>
        </div>
        {!hasPoints && !isLoading ? <div className="mb-4 text-[13px] text-brand-textMuted">No scalar data yet.</div> : null}
        <div className="relative">
          {hovered && closest ? (
            <div className={tooltipClass} style={tooltipStyle}>
              <div className="flex items-center justify-between gap-3 text-[12px] text-brand-text">
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
            className="h-[220px] w-full"
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

  return (
    <>
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
              <span className="rounded-full border border-brand-border px-2 py-0.5 text-[11px] font-semibold text-brand-textMuted">
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
    </>
  );
}
