import type { ReactElement } from "react";

interface TabBarProps {
  readonly activeTab: string;
  readonly tabs: string[];
}

export default function TabBar({ activeTab, tabs }: TabBarProps): ReactElement {
  return (
    <div className="mb-5 flex gap-4 border-b border-brand-border pb-2.5">
      {tabs.map((tab) => (
        <button
          className={tab === activeTab
            ? "border-b-2 border-brand-accent pb-1 text-sm font-semibold text-brand-text"
            : "border-b-2 border-transparent pb-1 text-sm text-brand-textMuted"}
          key={tab}
          type="button"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
