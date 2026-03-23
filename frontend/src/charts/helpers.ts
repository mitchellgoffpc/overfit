import type { Scalar } from "@underfit/types";

import type { LineSeries } from "charts/lineChart";

export const xFormatter = (value: number): string => value.toFixed(0);
export const yFormatter = (value: number): string => value.toFixed(2);

export const getClosestPoint = (series: LineSeries, targetX: number): { x: number; y: number } | null => {
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

export const getSeriesPoints = (scalars: Scalar[], metric: string): { x: number; y: number }[] =>
  scalars.flatMap((scalar, scalarIndex) => {
    const value = scalar.values[metric];
    if (typeof value !== "number") { return []; }
    return [{ x: scalar.step ?? scalarIndex, y: value }];
  });

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
