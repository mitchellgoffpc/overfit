import { colors } from "colors";

const X_TICK_TARGET = 6;
const Y_TICK_TARGET = 5;

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

const trimZeros = (value: string): string => value.replace(/\.?0+$/, "").replace(/\.$/, "");

const formatTick = (value: number): string => {
  const abs = Math.abs(value);
  if (abs === 0) { return "0"; }
  if (abs < 1e-3) {
    const exp = value.toExponential(2);
    const [rawMantissa, exponent = "0"] = exp.split("e");
    const mantissa = rawMantissa ?? "0";
    return `${trimZeros(mantissa)}e${exponent}`;
  }

  if (abs >= 1000) {
    const suffixes = ["", "k", "M", "G", "T", "P", "E"];
    const exponent = Math.min(Math.floor(Math.log10(abs) / 3), suffixes.length - 1);
    const scale = Math.pow(1000, exponent);
    const scaled = value / scale;
    const rawScaled = trimZeros(scaled.toFixed(6));
    const sigDigits = rawScaled.replace("-", "").replace(".", "").replace(/^0+/, "").length;
    if (sigDigits <= 4 && exponent > 0) {
      return `${trimZeros(scaled.toFixed(3))}${suffixes[exponent] ?? ""}`;
    }
  }

  if (abs >= 10) { return trimZeros(value.toFixed(1)); }
  return trimZeros(value.toFixed(2));
};

const roundTick = (value: number): number => Number(value.toFixed(12));

const getNiceTicks = (min: number, max: number, targetCount: number): number[] => {
  if (!Number.isFinite(min) || !Number.isFinite(max)) { return []; }
  if (min === max) { return [min]; }
  const range = max - min;
  const safeTarget = Math.max(2, targetCount);
  const idealStep = range / (safeTarget - 1);
  const exponent = Math.floor(Math.log10(Math.abs(idealStep)));
  const bases = [1, 2, 2.5, 5];
  const exponentRange = [exponent - 2, exponent - 1, exponent, exponent + 1, exponent + 2];
  let best: { step: number; countDiff: number; coverageDiff: number; ticks: number[] } | null = null;

  for (const exp of exponentRange) {
    const scale = Math.pow(10, exp);
    for (const base of bases) {
      const step = base * scale;
      if (!Number.isFinite(step) || step <= 0) { continue; }
      const first = Math.ceil(min / step) * step;
      const last = Math.floor(max / step) * step;
      if (first > last) { continue; }
      const count = Math.floor((last - first) / step) + 1;
      const ticks: number[] = [];
      for (let i = 0; i < count; i += 1) {
        const value = roundTick(first + i * step);
        if (value < min - 1e-9 || value > max + 1e-9) { continue; }
        ticks.push(value);
      }
      if (ticks.length === 0) { continue; }
      const countDiff = Math.abs(ticks.length - targetCount);
      const firstTick = ticks[0];
      const lastTick = ticks[ticks.length - 1];
      if (firstTick === undefined || lastTick === undefined) { continue; }
      const coverageDiff = Math.abs((lastTick - firstTick) - range);
      const isBetter = !best
        || countDiff < best.countDiff
        || (countDiff === best.countDiff && coverageDiff < best.coverageDiff)
        || (countDiff === best.countDiff && coverageDiff === best.coverageDiff && step < best.step);
      if (isBetter) {
        best = { step, countDiff, coverageDiff, ticks };
      }
    }
  }

  return best?.ticks ?? [];
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

export const drawLineChart = (
  canvas: HTMLCanvasElement, series: LineSeries[], options: LineChartOptions, hoverOverlay?: LineChartHoverOverlay | null
): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) { return; }

  const dpr = window.devicePixelRatio || 1;
  const geometry = getLineChartGeometry(series, options);
  const { width, height, padding, plotWidth, plotHeight, xMin, xMax, xScale, yScale } = geometry;
  const { yMin, yMax } = getExtent(series);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${String(width)}px`;
  canvas.style.height = `${String(height)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const background = options.background ?? colors.chart.bg;
  const gridColor = options.gridColor ?? colors.chart.grid;
  const axisColor = options.axisColor ?? colors.chart.axis;
  const textColor = options.textColor ?? colors.chart.text;
  const font = options.font ?? "11px Space Grotesk, system-ui, sans-serif";

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const xTickValues = getNiceTicks(xMin, xMax, Math.max(2, options.xTicks ?? X_TICK_TARGET));
  const yTickValues = getNiceTicks(yMin, yMax, Math.max(2, options.yTicks ?? Y_TICK_TARGET));

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  for (const value of xTickValues) {
    const x = xScale(value);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();
  }

  for (const value of yTickValues) {
    const y = yScale(value);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.stroke();

  ctx.font = font;
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const yFormatter = options.yLabelFormatter ?? formatTick;
  for (const value of yTickValues) {
    const y = yScale(value);
    ctx.fillText(yFormatter(value), 8, y);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const xFormatter = options.xLabelFormatter ?? formatTick;
  for (let i = 0; i < xTickValues.length; i += 1) {
    if (i === 0) { continue; }
    const value = xTickValues[i];
    if (value === undefined) { continue; }
    const x = xScale(value);
    ctx.fillText(xFormatter(value), x, padding.top + plotHeight + 8);
  }

  for (const line of series) {
    if (line.points.length === 0) { continue; }
    ctx.strokeStyle = line.color ?? colors.brand.accent;
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
    const hoverColor = hoverOverlay.color ?? colors.chart.hover;

    ctx.strokeStyle = hoverColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    ctx.fillStyle = colors.brand.surface;
    ctx.strokeStyle = hoverColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
};
