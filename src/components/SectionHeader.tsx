import type { ReactElement } from "react";

import { RULED_LINE } from "helpers";

interface SectionHeaderProps {
  readonly title: string;
  readonly subtitle: string;
  readonly sectionLabel?: string;
}

export default function SectionHeader({ title, subtitle, sectionLabel = "Section A" }: SectionHeaderProps): ReactElement {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3" style={{ paddingTop: RULED_LINE }}>
      <div>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>{sectionLabel}</p>
        <h2 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>{title}</h2>
      </div>
      <div className="hidden rounded-full border border-brand-borderMuted bg-white/90 px-3 py-1 text-[0.75rem] text-brand-textMuted xs:block">
        {subtitle}
      </div>
    </header>
  );
}
