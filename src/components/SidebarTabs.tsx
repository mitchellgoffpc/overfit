import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactElement } from "react";
import { Link } from "wouter";

interface SidebarTabsProps {
  readonly tabs: readonly SidebarTab[];
  readonly activeTabId: string;
}

export interface SidebarTab {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: IconDefinition;
}

export default function SidebarTabs({ tabs, activeTabId }: SidebarTabsProps): ReactElement {
  return (
    <nav className="mt-7 grid gap-2">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={"flex items-center gap-2.5 rounded-lg border px-3 py-2 text-[0.8125rem] no-underline transition"
              + (isActive
                ? " border-brand-accent bg-brand-accentMuted font-semibold text-brand-accent"
                : " border-brand-borderMuted bg-white text-brand-textMuted hover:border-brand-borderStrong hover:text-brand-text")}
          >
            <FontAwesomeIcon icon={tab.icon} className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
