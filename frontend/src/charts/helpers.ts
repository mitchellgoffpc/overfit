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
