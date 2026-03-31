import type { ReactElement, ReactNode } from "react";
import { useMemo } from "react";

import { RULED_LINE } from "helpers";

interface SettingsSidebarStat {
  readonly label: string;
  readonly value: ReactNode;
}

interface SettingsSidebarProps {
  readonly sectionLabel: string;
  readonly stats: SettingsSidebarStat[];
}

export default function SettingsSidebar({ sectionLabel, stats }: SettingsSidebarProps): ReactElement {
  const notebookDate = useMemo(
    () => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    []
  );

  return (
    <aside className="border-b border-brand-borderMuted px-4 py-5 lg:border-b-0 lg:border-r lg:border-brand-borderMuted lg:pt-8 lg:pr-5">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
      <h2 className="mt-1 font-display text-[2.125rem] leading-none text-brand-text">Settings</h2>
      <p className="mt-2 font-mono text-[0.6875rem] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{notebookDate}</p>
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] mt-7 text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{sectionLabel}</p>
      {stats.map((stat) => (
        <div className="flex items-center justify-between text-[0.75rem]" style={{ height: RULED_LINE }} key={stat.label}>
          <span className="text-brand-textMuted">{stat.label}</span>
          <span className="font-semibold text-brand-text">{stat.value}</span>
        </div>
      ))}
    </aside>
  );
}
