import type { ReactElement } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { LineChartOptions, LineSeries } from "charts/lineChart";
import { drawLineChart } from "charts/lineChart";

interface LineChartProps {
  readonly series: LineSeries[];
  readonly height?: number;
  readonly className?: string;
  readonly xLabelFormatter?: LineChartOptions["xLabelFormatter"];
  readonly yLabelFormatter?: LineChartOptions["yLabelFormatter"];
}

export default function LineChart({ series, height = 220, className, xLabelFormatter, yLabelFormatter }: LineChartProps): ReactElement {
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
    padding: { left: 44, right: 16, top: 16, bottom: 30 },
    xTicks: 6,
    yTicks: 5,
    background: "#ffffff",
    gridColor: "#edf2f2",
    axisColor: "#d7e2e2",
    textColor: "#627070",
    xLabelFormatter,
    yLabelFormatter,
    font: "11px Space Grotesk, system-ui, sans-serif",
  }), [height, width, xLabelFormatter, yLabelFormatter]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0) { return; }
    drawLineChart(canvas, series, options);
  }, [options, series, width]);

  return (
    <div className={className} ref={containerRef}>
      <canvas ref={canvasRef} />
    </div>
  );
}
