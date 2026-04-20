import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CSSProperties, ReactElement } from "react";
import { Link } from "wouter";

import { RULED_LINE_HEIGHT } from "helpers";

interface SidebarTabsProps {
  readonly tabs: readonly SidebarTab[];
  readonly activeTabId: string;
  readonly className?: string;
}

export interface SidebarTab {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: IconDefinition;
}

const SIDEBAR_TABS_TOP_MARGIN = 1.25 * RULED_LINE_HEIGHT;
const SIDEBAR_TAB_HEIGHT = 1.25 * RULED_LINE_HEIGHT;
const SIDEBAR_TAB_GAP = 0.25 * RULED_LINE_HEIGHT;

const getSidebarTabsBlockHeight = (count: number): CSSProperties["height"] => {
  const naturalHeight = SIDEBAR_TABS_TOP_MARGIN + count * SIDEBAR_TAB_HEIGHT + Math.max(0, count - 1) * SIDEBAR_TAB_GAP;
  const roundedLineCount = Math.ceil(naturalHeight / RULED_LINE_HEIGHT);
  return `${String(roundedLineCount * RULED_LINE_HEIGHT - SIDEBAR_TABS_TOP_MARGIN)}rem`;
};

export default function SidebarTabs({ tabs, activeTabId, className }: SidebarTabsProps): ReactElement {
  return (
    <nav
      className={`grid content-start${className ? ` ${className}` : ""}`}
      style={{ gap: `${String(SIDEBAR_TAB_GAP)}rem`, height: getSidebarTabsBlockHeight(tabs.length), marginTop: `${String(SIDEBAR_TABS_TOP_MARGIN)}rem` }}
    >
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
            style={{ height: `${String(SIDEBAR_TAB_HEIGHT)}rem` }}
          >
            <FontAwesomeIcon icon={tab.icon} className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
