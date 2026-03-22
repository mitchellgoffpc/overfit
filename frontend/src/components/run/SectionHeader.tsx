import type { ReactElement } from "react";

interface SectionHeaderProps {
  readonly title: string;
  readonly subtitle: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps): ReactElement {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d4dfdf] pb-3">
      <div>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Section A</p>
        <h2 className="mt-1 font-display text-[2.125rem] leading-none text-brand-text">{title}</h2>
      </div>
      <div className="rounded-full border border-[#cfdddd] bg-white/90 px-3 py-1 text-[0.75rem] text-brand-textMuted">
        {subtitle}
      </div>
    </header>
  );
}
