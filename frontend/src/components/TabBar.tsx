import type { ReactElement } from "react";

interface TabBarProps {
  readonly activeTab: string;
  readonly tabs: string[];
}

export default function TabBar({ activeTab, tabs }: TabBarProps): ReactElement {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button className={tab === activeTab ? "tabs__item tabs__item--active" : "tabs__item"} key={tab} type="button">
          {tab}
        </button>
      ))}
    </div>
  );
}
