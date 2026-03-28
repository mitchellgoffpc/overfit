import type { ReactElement, ReactNode } from "react";

import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";

interface CollapsibleSectionProps {
  readonly label: string;
  readonly count: number;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly trailing?: ReactNode;
  readonly children: ReactNode;
}

export default function CollapsibleSection({ label, count, collapsed, onToggle, trailing, children }: CollapsibleSectionProps): ReactElement {
  return (
    <section className="last:mb-0">
      <header
        className="flex items-center justify-between gap-2"
        style={collapsed ? undefined : { marginBottom: `${String(RULED_LINE_HEIGHT / 2)}rem` }}
      >
        <button
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-brand-textMuted"
          type="button"
          style={{ lineHeight: RULED_LINE }}
          onClick={onToggle}
        >
          <span className={`transition-transform ${collapsed ? "-rotate-90" : "rotate-0"}`}>
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
              <path d="M4 6.25 8 10l4-3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
            </svg>
          </span>
          <span>{label}</span>
          <span className="h-5 w-5 text-center rounded bg-log-badge text-[0.6875rem] font-semibold leading-5 text-brand-textMuted">
            {count}
          </span>
        </button>
        {!collapsed && trailing ? trailing : null}
      </header>
      {collapsed ? null : children}
    </section>
  );
}
