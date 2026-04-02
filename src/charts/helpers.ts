import type { Scalar } from "types";

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
