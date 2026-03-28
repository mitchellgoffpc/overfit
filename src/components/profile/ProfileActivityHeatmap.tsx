import type { ReactElement } from "react";
import { useMemo } from "react";

import type { Run } from "types";

interface ProfileActivityHeatmapProps {
  readonly runs: Run[];
}

const WEEK_COUNT = 52;

const levelClasses = [
  "bg-heatmap-level0",
  "bg-heatmap-level1",
  "bg-heatmap-level2",
  "bg-heatmap-level3",
  "bg-brand-accentStrong",
];

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10);

const clampLevel = (value: number): number => Math.min(levelClasses.length - 1, Math.max(0, value));

export default function ProfileActivityHeatmap({ runs }: ProfileActivityHeatmapProps): ReactElement {
  const { weekColumns, monthHeaders } = useMemo(() => {
    const counts = new Map<string, number>();
    runs.forEach((run) => {
      const date = new Date(run.createdAt);
      if (!Number.isNaN(date.getTime())) {
        const key = toDateKey(date);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    });

    const today = new Date();
    const start = new Date(today);
    const dayOffset = start.getDay();
    start.setDate(start.getDate() - dayOffset - (WEEK_COUNT - 1) * 7);

    const weekMatrix = Array.from({ length: WEEK_COUNT }, (_week, weekIndex) => {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + weekIndex * 7);
      return Array.from({ length: 7 }, (_day, dayIndex) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        const key = toDateKey(date);
        const count = counts.get(key) ?? 0;
        const level = clampLevel(count === 0 ? 0 : Math.ceil(count / 2));
        return { key, count, level, date };
      });
    });

    const monthLabels = weekMatrix.map((week, index) => {
      const weekStart = week[0];
      if (!weekStart) { return ""; }
      const month = weekStart.date.toLocaleDateString("en-US", { month: "short" });
      if (index === 0) { return month; }
      const previousWeekStart = weekMatrix[index - 1]?.[0];
      if (!previousWeekStart) { return month; }
      const previousMonth = previousWeekStart.date.toLocaleDateString("en-US", { month: "short" });
      return month === previousMonth ? "" : month;
    });

    return { weekColumns: weekMatrix, monthHeaders: monthLabels };
  }, [runs]);

  return (
    <section className="rounded-[1.125rem] border border-brand-borderMuted bg-brand-surfaceTinted/90 p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-brand-textMuted">Section C</p>
          <h2 className="mt-1 text-xl">Activity</h2>
          <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Runs created in the last {WEEK_COUNT} weeks.</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[0.6875rem] text-brand-textMuted">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {levelClasses.map((classes) => (
              <span className={`h-2.5 w-2.5 rounded-sm ${classes}`} key={classes} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-[2rem_1fr] items-start gap-3">
          <div className="grid grid-rows-[repeat(7,_1fr)] gap-1 pt-6 text-[0.6875rem] text-brand-textMuted">
            {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => (
              <span className="h-3 leading-3" key={`day-label-${String(index)}`}>{label}</span>
            ))}
          </div>
          <div className="grid gap-2">
            <div className="inline-grid auto-cols-[0.75rem] grid-flow-col gap-1 text-[0.6875rem] text-brand-textMuted">
              {monthHeaders.map((label, index) => (
                <span className="h-4 text-left leading-4" key={`month-${String(index)}`}>{label}</span>
              ))}
            </div>
            <div className="inline-grid auto-cols-[0.75rem] grid-flow-col gap-1">
              {weekColumns.map((week, weekIndex) => (
                <div className="grid grid-rows-[repeat(7,_1fr)] gap-1" key={week[0]?.key ?? String(weekIndex)}>
                  {week.map((day) => {
                    const levelClass = levelClasses[day.level] ?? "bg-heatmap-level0";
                    const label = String(day.count) + " runs on " + day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <span
                        className={`h-3 w-3 rounded-sm ${levelClass}`}
                        key={day.key + "-" + String(weekIndex)}
                        title={label}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
