import type { CSSProperties, ReactElement, ReactNode } from "react";

import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";

interface SectionHeaderProps {
  readonly title: string;
  readonly subtitle: string;
  readonly sectionLabel?: string;
  readonly numLines?: number;
  readonly children?: ReactNode;
}

export default function SectionHeader({ title, subtitle, sectionLabel = "Section A", numLines = 4, children }: SectionHeaderProps): ReactElement {
  const header = (
    <header className={`flex flex-wrap items-center justify-between gap-3${numLines > 0 ? "" : " mb-6"}`}>
      <div>
        <p
          className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted"
          style={{ lineHeight: RULED_LINE }}
        >{sectionLabel}</p>
        <h2 className="font-display text-[2.125rem] leading-none text-brand-text" style={{ height: RULED_LINE }}>{title}</h2>
      </div>
      <div className="rounded-full border border-[#cfdddd] bg-white/90 px-3 py-1 text-[0.75rem] text-brand-textMuted">
        {subtitle}
      </div>
    </header>
  );

  if (numLines > 0) {
    const h = `calc(${String(numLines * RULED_LINE_HEIGHT)}rem + 1px)`;
    const pt = `calc(${String(RULED_LINE_HEIGHT)}rem + 1px)`;
    const style: CSSProperties = { height: h, paddingTop: pt };
    return (
      <div className="flex flex-col" style={style}>
        {header}
        {children}
      </div>
    );
  }

  return header;
}
