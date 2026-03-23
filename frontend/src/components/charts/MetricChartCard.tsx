import type { ReactElement } from "react";

import { getClosestPoint, xFormatter, yFormatter } from "charts/helpers";
import type { LineSeries } from "charts/lineChart";
import type { LineChartHover } from "components/charts/LineChart";
import LineChart from "components/charts/LineChart";
import { RULED_LINE_HEIGHT } from "helpers";

export interface ChartSeries extends LineSeries {
  readonly label: string;
  readonly color: string;
  readonly lineWidth: number;
}

interface MetricChartCardProps {
  readonly metric: string;
  readonly series: ChartSeries[];
  readonly hovered: LineChartHover | null;
  readonly onHover: (hover: LineChartHover | null) => void;
  readonly hasPoints: boolean;
  readonly isLoading: boolean;
}

const tooltipClass = "pointer-events-none absolute z-10 max-w-[17.5rem] rounded-[0.625rem] border border-brand-border"
  + " bg-brand-surface/96 px-3 py-2 shadow-soft backdrop-blur";

export default function MetricChartCard({ metric, series, hovered, onHover, hasPoints, isLoading }: MetricChartCardProps): ReactElement {
  const tooltipItems = hovered ? series.flatMap((line) => {
    const point = getClosestPoint(line, hovered.step);
    if (!point) { return []; }
    return [{ label: line.label, color: line.color, value: point.y }];
  }) : [];
  const isLeft = (hovered?.xRatio ?? 0) < 0.5;
  const tooltipStyle = !hovered ? undefined
    : { left: `${String(hovered.cursorX)}px`, top: "0.5rem", transform: isLeft ? "translateX(0.75rem)" : "translateX(calc(-100% - 0.75rem))" };
  const isSingle = series.length <= 1;

  return (
    <div
      className="relative flex flex-col rounded-xl border border-brand-border bg-brand-surface px-2 pb-1.5 pt-2 shadow-soft"
      style={{ height: `${String(9 * RULED_LINE_HEIGHT)}rem` }}
    >
      <div className="mb-1 flex flex-col items-center gap-0">
        <h2 className="text-[0.8125rem] font-semibold text-brand-text">{metric}</h2>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.6875rem] text-brand-textMuted">
          {series.map((line) => (
            <div className="flex items-center gap-1.5" key={line.id}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />
              <span className="max-w-[7.5rem] truncate">{line.label}</span>
            </div>
          ))}
        </div>
      </div>
      {!hasPoints && !isLoading ? <div className="mb-4 text-[0.8125rem] text-brand-textMuted">No scalar data yet.</div> : null}
      <div className="relative min-h-0 flex-1">
        {hovered && tooltipItems.length > 0 ? (
          <div className={tooltipClass} style={tooltipStyle}>
            {isSingle ? (
              <div className="flex items-center justify-between gap-3 text-[0.75rem] text-brand-text">
                <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tooltipItems[0]!.color }} />
                  <span className="truncate">{metric}</span>
                  <span className="text-brand-textMuted">step {xFormatter(hovered.step)}</span>
                </div>
                <span className="font-semibold">{yFormatter(tooltipItems[0]!.value)}</span>
              </div>
            ) : (
              <>
                <div className="mb-1 text-[0.6875rem] text-brand-textMuted">step {xFormatter(hovered.step)}</div>
                <div className="space-y-1.5">
                  {tooltipItems.map((item) => (
                    <div className="flex items-center justify-between gap-3 text-[0.75rem] text-brand-text" key={item.label}>
                      <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="font-semibold">{yFormatter(item.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
        <LineChart
          className="h-full w-full"
          series={series.filter((line) => line.points.length > 0)}
          height={220}
          xLabelFormatter={xFormatter}
          yLabelFormatter={yFormatter}
          hoverStep={hovered?.step ?? null}
          onHover={onHover}
        />
      </div>
    </div>
  );
}
