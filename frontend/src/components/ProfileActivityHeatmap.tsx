import type { Run } from "@underfit/types";
import type { ReactElement } from "react";
import { useMemo } from "react";

interface ProfileActivityHeatmapProps {
  readonly runs: Run[];
}

const WEEK_COUNT = 20;

const levelClasses = [
  "bg-[#e7ecef]",
  "bg-[#cbe7e1]",
  "bg-[#8fd3c8]",
  "bg-[#4fb8aa]",
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
    const dayOffset = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayOffset - (WEEK_COUNT - 1) * 7);

    const weekMatrix = Array.from({ length: WEEK_COUNT }, (unusedWeek, weekIndex) => {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + weekIndex * 7);
      return Array.from({ length: 7 }, (unusedDay, dayIndex) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + dayIndex);
        const key = toDateKey(date);
        const count = counts.get(key) ?? 0;
        const level = clampLevel(count === 0 ? 0 : Math.ceil(count / 2));
        return { key, count, level, date };
      });
    });

    const monthLabels = weekMatrix.map((week, index) => {
      const month = week[0].date.toLocaleDateString("en-US", { month: "short" });
      if (index === 0) { return month; }
      const previousMonth = weekMatrix[index - 1][0].date.toLocaleDateString("en-US", { month: "short" });
      return month === previousMonth ? "" : month;
    });

    return { weekColumns: weekMatrix, monthHeaders: monthLabels };
  }, [runs]);

  return (
    <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl">Activity</h2>
          <p className="mt-1.5 text-[13px] text-brand-textMuted">Runs created in the last {WEEK_COUNT} weeks.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-brand-textMuted">
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
        <div className="grid grid-cols-[32px_1fr] items-start gap-3">
          <div className="grid gap-4 text-[11px] text-brand-textMuted">
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-[repeat(20,_1fr)] gap-1 text-[11px] text-brand-textMuted">
              {monthHeaders.map((label, index) => (
                <span className="text-center" key={`month-${String(index)}`}>{label}</span>
              ))}
            </div>
            <div className="grid grid-cols-[repeat(20,_1fr)] gap-1">
              {weekColumns.map((week, weekIndex) => (
                <div className="grid gap-1" key={week[0]?.key ?? String(weekIndex)}>
                  {week.map((day) => {
                    const levelClass = levelClasses[day.level] ?? "bg-[#e7ecef]";
                    const label = String(day.count) + " runs on " + day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <span
                        className={`h-3 w-3 rounded-[3px] ${levelClass}`}
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
