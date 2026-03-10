import type { PointerEvent, ReactElement } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { LineChartGeometry, LineChartHoverOverlay, LineChartOptions, LinePoint, LineSeries } from "charts/lineChart";
import { drawLineChart, getLineChartGeometry } from "charts/lineChart";

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

const findClosestPoint = (series: LineSeries[], targetX: number): LinePoint | null => {
  let closest: LinePoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const line of series) {
    for (const point of line.points) {
      const distance = Math.abs(point.x - targetX);
      if (distance < bestDistance) {
        bestDistance = distance;
        closest = point;
      }
    }
  }

  return closest;
};

export default function LineChart({ series, height = 220, className, xLabelFormatter, yLabelFormatter, onHover, hoverStep }: LineChartProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) { return; }

    const observer = new ResizeObserver((entries) => {
      if (entries.length === 0) { return; }
      const nextWidth = Math.floor(entries[0].contentRect.width);
      setWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    });

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, []);

  const options = useMemo<LineChartOptions>(() => ({
    width,
    height,
    padding: { left: 36, right: 12, top: 10, bottom: 24 },
    xTicks: 6,
    yTicks: 5,
    background: "#ffffff",
    gridColor: "#edf2f2",
    axisColor: "#d7e2e2",
    textColor: "#627070",
    xLabelFormatter,
    yLabelFormatter,
    font: "10px Space Grotesk, system-ui, sans-serif",
  }), [height, width, xLabelFormatter, yLabelFormatter]);

  const geometry = useMemo<LineChartGeometry | null>(() => {
    if (width === 0) { return null; }
    return getLineChartGeometry(series, options);
  }, [options, series, width]);

  const hoverOverlay = useMemo<LineChartHoverOverlay | null>(() => {
    if (hoverStep === null || hoverStep === undefined || series.length === 0) { return null; }
    const closest = findClosestPoint(series, hoverStep);
    if (!closest) { return null; }
    return { point: closest, color: series[0]?.color ?? "#1a7b7d" };
  }, [hoverStep, series]);

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
    const closest = findClosestPoint(series, targetX);
    if (!closest) {
      if (typeof onHover === "function") { onHover(null); }
      return;
    }

    const cursorX = geometry.xScale(closest.x);
    const xRatio = geometry.width > 0 ? cursorX / geometry.width : 0;
    if (typeof onHover === "function") { onHover({ step: closest.x, cursorX, xRatio }); }
  }, [geometry, onHover, series]);

  const handlePointerLeave = useCallback(() => {
    if (typeof onHover === "function") { onHover(null); }
  }, [onHover]);

  return (
    <div className={className} ref={containerRef} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
      <canvas ref={canvasRef} />
    </div>
  );
}
