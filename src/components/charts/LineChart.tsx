import type { PointerEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LineChartGeometry, LineChartHoverOverlay, LineChartOptions, LinePoint, LineSeries } from "charts/lineChart";
import { drawLineChart, getLineChartGeometry } from "charts/lineChart";
import { colors } from "colors";

interface LineChartProps {
  readonly series: LineSeries[];
  readonly height?: number;
  readonly className?: string;
  readonly xLabelFormatter?: LineChartOptions["xLabelFormatter"];
  readonly yLabelFormatter?: LineChartOptions["yLabelFormatter"];
  readonly onHover?: (hover: LineChartHover | null) => void;
  readonly hoverStep?: number | null;
}

export interface LineChartHover {
  step: number;
  cursorX: number;
  xRatio: number;
}

const findClosestPoint = (series: LineSeries[], targetX: number, targetY?: number | null): { point: LinePoint; seriesIndex: number } | null => {
  let best: { point: LinePoint; seriesIndex: number } | null = null;
  let bestXDist = Number.POSITIVE_INFINITY;
  let bestYDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < series.length; i++) {
    for (const point of series[i]!.points) {
      const xDist = Math.abs(point.x - targetX);
      if (xDist < bestXDist) {
        bestXDist = xDist;
        bestYDist = targetY !== null && targetY !== undefined ? Math.abs(point.y - targetY) : Number.POSITIVE_INFINITY;
        best = { point, seriesIndex: i };
      } else if (xDist === bestXDist && targetY !== null && targetY !== undefined) {
        const yDist = Math.abs(point.y - targetY);
        if (yDist < bestYDist) {
          bestYDist = yDist;
          best = { point, seriesIndex: i };
        }
      }
    }
  }

  return best;
};

export default function LineChart({ series, height = 220, className, xLabelFormatter, yLabelFormatter, onHover, hoverStep }: LineChartProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(0);
  const [cursorDataY, setCursorDataY] = useState<number | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) { return; }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) { return; }
      const nextWidth = Math.floor(entry.contentRect.width);
      setWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const options = useMemo<LineChartOptions>(() => {
    const base: LineChartOptions = {
      width,
      height,
      padding: { left: 36, right: 12, top: 10, bottom: 24 },
      xTicks: 6,
      yTicks: 5,
      background: colors.chart.bg,
      gridColor: colors.chart.grid,
      axisColor: colors.chart.axis,
      textColor: colors.chart.text,
      font: "10px Space Grotesk, system-ui, sans-serif",
    };
    if (xLabelFormatter) { base.xLabelFormatter = xLabelFormatter; }
    if (yLabelFormatter) { base.yLabelFormatter = yLabelFormatter; }
    return base;
  }, [height, width, xLabelFormatter, yLabelFormatter]);

  const geometry = useMemo<LineChartGeometry | null>(() => {
    if (width === 0) { return null; }
    return getLineChartGeometry(series, options);
  }, [options, series, width]);

  const hoverOverlay = useMemo<LineChartHoverOverlay | null>(() => {
    if (hoverStep === null || hoverStep === undefined || series.length === 0) { return null; }
    const match = findClosestPoint(series, hoverStep, cursorDataY);
    if (!match) { return null; }
    return { point: match.point, color: series[match.seriesIndex]?.color ?? colors.brand.accent };
  }, [cursorDataY, hoverStep, series]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) { return; }
    drawLineChart(canvas, series, options, hoverOverlay);
  }, [options, series, width, hoverOverlay]);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!geometry || !containerRef.current) { return; }
    if (!series.length || series.every((line) => line.points.length === 0)) {
      if (typeof onHover === "function") { onHover(null); }
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const withinX = localX >= geometry.padding.left && localX <= geometry.padding.left + geometry.plotWidth;
    const withinY = localY >= geometry.padding.top && localY <= geometry.padding.top + geometry.plotHeight;

    if (!withinX || !withinY) {
      if (typeof onHover === "function") { onHover(null); }
      return;
    }

    const clampedPlotX = Math.min(Math.max(localX, geometry.padding.left), geometry.padding.left + geometry.plotWidth);
    const targetX = geometry.xUnscale(clampedPlotX);
    const targetY = geometry.yUnscale(localY);
    const match = findClosestPoint(series, targetX, targetY);
    if (!match) {
      setCursorDataY(null);
      if (typeof onHover === "function") { onHover(null); }
      return;
    }

    setCursorDataY(targetY);
    const cursorX = geometry.xScale(match.point.x);
    const xRatio = geometry.width > 0 ? cursorX / geometry.width : 0;
    if (typeof onHover === "function") { onHover({ step: match.point.x, cursorX, xRatio }); }
  }, [geometry, onHover, series]);

  const handlePointerLeave = useCallback(() => {
    setCursorDataY(null);
    if (typeof onHover === "function") { onHover(null); }
  }, [onHover]);

  return (
    <div className={className} ref={containerRef} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <canvas ref={canvasRef} />
    </div>
  );
}
