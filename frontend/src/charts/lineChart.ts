export interface LinePoint { x: number; y: number }

export interface LineSeries {
  id: string;
  points: LinePoint[];
  color?: string;
  lineWidth?: number;
}

export interface LineChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface LineChartOptions {
  width: number;
  height: number;
  padding?: Partial<LineChartPadding>;
  xTicks?: number;
  yTicks?: number;
  background?: string;
  gridColor?: string;
  axisColor?: string;
  textColor?: string;
  font?: string;
  xLabelFormatter?: (value: number) => string;
  yLabelFormatter?: (value: number) => string;
}

export interface LineChartHoverOverlay {
  point: LinePoint;
  color?: string;
}

export interface LineChartGeometry {
  width: number;
  height: number;
  padding: LineChartPadding;
  plotWidth: number;
  plotHeight: number;
  xMin: number;
  xMax: number;
  yMinAdjusted: number;
  yMaxAdjusted: number;
  xScale: (value: number) => number;
  yScale: (value: number) => number;
  xUnscale: (value: number) => number;
  yUnscale: (value: number) => number;
}

const defaultPadding: LineChartPadding = {
  top: 18,
  right: 18,
  bottom: 28,
  left: 42,
};

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getExtent = (series: LineSeries[]): { xMin: number; xMax: number; yMin: number; yMax: number } => {
  let xMin = Number.POSITIVE_INFINITY;
  let xMax = Number.NEGATIVE_INFINITY;
  let yMin = Number.POSITIVE_INFINITY;
  let yMax = Number.NEGATIVE_INFINITY;

  for (const line of series) {
    for (const point of line.points) {
      if (point.x < xMin) { xMin = point.x; }
      if (point.x > xMax) { xMax = point.x; }
      if (point.y < yMin) { yMin = point.y; }
      if (point.y > yMax) { yMax = point.y; }
    }
  }

  if (!Number.isFinite(xMin) || !Number.isFinite(yMin)) {
    return { xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  }

  if (xMin === xMax) {
    xMin -= 1;
    xMax += 1;
  }

  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }

  return { xMin, xMax, yMin, yMax };
};

const formatTick = (value: number): string => {
  if (Math.abs(value) >= 1000) { return value.toFixed(0); }
  if (Math.abs(value) >= 10) { return value.toFixed(1); }
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
};

export const getLineChartGeometry = (series: LineSeries[], options: LineChartOptions): LineChartGeometry => {
  const width = clamp(options.width, 1, 4096);
  const height = clamp(options.height, 1, 4096);
  const padding = { ...defaultPadding, ...options.padding };
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = Math.max(1, height - padding.top - padding.bottom);

  const { xMin, xMax, yMin, yMax } = getExtent(series);
  const yRangePadding = (yMax - yMin) * 0.06 || 1;
  const yMinAdjusted = yMin - yRangePadding;
  const yMaxAdjusted = yMax + yRangePadding;

  const xScale = (value: number): number => padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
  const yScale = (value: number): number => padding.top + plotHeight - ((value - yMinAdjusted) / (yMaxAdjusted - yMinAdjusted)) * plotHeight;
  const xUnscale = (value: number): number => xMin + ((value - padding.left) / plotWidth) * (xMax - xMin);
  const yUnscale = (value: number): number => yMinAdjusted + ((padding.top + plotHeight - value) / plotHeight) * (yMaxAdjusted - yMinAdjusted);

  return { width, height, padding, plotWidth, plotHeight, xMin, xMax, yMinAdjusted, yMaxAdjusted, xScale, yScale, xUnscale, yUnscale };
};

export const drawLineChart = (canvas: HTMLCanvasElement, series: LineSeries[], options: LineChartOptions, hoverOverlay?: LineChartHoverOverlay | null): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) { return; }

  const dpr = window.devicePixelRatio || 1;
  const geometry = getLineChartGeometry(series, options);
  const { width, height, padding, plotWidth, plotHeight, xMin, xMax, yMinAdjusted, yMaxAdjusted, xScale, yScale } = geometry;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${String(width)}px`;
  canvas.style.height = `${String(height)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const background = options.background ?? "#ffffff";
  const gridColor = options.gridColor ?? "#e5eeee";
  const axisColor = options.axisColor ?? "#cdd9d9";
  const textColor = options.textColor ?? "#5b6b6b";
  const font = options.font ?? "11px Space Grotesk, system-ui, sans-serif";

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const xTicks = Math.max(2, options.xTicks ?? 6);
  const yTicks = Math.max(2, options.yTicks ?? 5);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  for (let i = 0; i < xTicks; i += 1) {
    const t = i / (xTicks - 1);
    const x = padding.left + t * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }

  for (let i = 0; i < yTicks; i += 1) {
    const t = i / (yTicks - 1);
    const y = padding.top + t * plotHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(padding.left, padding.top, plotWidth, plotHeight);

  ctx.font = font;
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const yFormatter = options.yLabelFormatter ?? formatTick;
  for (let i = 0; i < yTicks; i += 1) {
    const t = i / (yTicks - 1);
    const value = yMaxAdjusted - t * (yMaxAdjusted - yMinAdjusted);
    const y = padding.top + t * plotHeight;
    ctx.fillText(yFormatter(value), 8, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xFormatter = options.xLabelFormatter ?? formatTick;
  for (let i = 0; i < xTicks; i += 1) {
    const t = i / (xTicks - 1);
    const value = xMin + t * (xMax - xMin);
    const x = padding.left + t * plotWidth;
    ctx.fillText(xFormatter(value), x, padding.top + plotHeight + 8);
  }

  for (const line of series) {
    if (line.points.length === 0) { continue; }
    ctx.strokeStyle = line.color ?? "#1a7b7d";
    ctx.lineWidth = line.lineWidth ?? 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();

    line.points.forEach((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
  }

  if (hoverOverlay) {
    const x = xScale(hoverOverlay.point.x);
    const y = yScale(hoverOverlay.point.y);
    const hoverColor = hoverOverlay.color ?? "#8fd0d1";

    ctx.strokeStyle = hoverColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = hoverColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
};
