import type { ScalarSeries } from "types";

export const getSeriesPoints = (series: ScalarSeries | null, metric: string): { x: number; y: number }[] => {
  if (!series) { return []; }
  const entry = series.series[metric];
  if (!entry) { return []; }
  const axis = series.axes[entry.axis];
  if (!axis) { return []; }
  return entry.values.map((y, i) => ({ x: axis.steps[i] ?? i, y }));
};

export const groupChartsByPrefix = <T extends { id: string }>(items: T[]): { prefix: string; charts: T[] }[] => {
  const buckets = new Map<string, T[]>();
  items.forEach((item) => {
    const [firstSegment] = item.id.split("/");
    const prefix = item.id.includes("/") ? (firstSegment ?? "other") : "other";
    const list = buckets.get(prefix) ?? [];
    list.push(item);
    buckets.set(prefix, list);
  });
  return Array.from(buckets.keys()).sort().flatMap((prefix) => {
    const list = buckets.get(prefix);
    if (!list || list.length === 0) { return []; }
    return [{ prefix, charts: list }];
  });
};
