import type { ReactElement, ReactNode } from "react";

interface PageHeaderMetric {
  readonly label: string;
  readonly value: string;
}

interface PageHeaderProps {
  readonly badge: string;
  readonly title: string;
  readonly description?: string;
  readonly metrics?: readonly PageHeaderMetric[];
  readonly action?: ReactNode;
}

export default function PageHeader({ badge, title, description, metrics = [], action }: PageHeaderProps): ReactElement {
  const scope = `${badge.toLowerCase()}::${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <header className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
      <div className="min-w-0">
        <h1 className="font-mono text-[20px] font-semibold leading-none tracking-[-0.01em] text-brand-text">
          <span className="text-brand-accent">&gt;</span> {scope}
        </h1>
        {description ? <p className="mt-1 text-[12px] text-brand-textMuted">{description}</p> : null}
        {metrics.length > 0 ? (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-brand-textMuted">
            {metrics.map((metric) => (
              <span key={metric.label}>
                <span className="text-brand-accent">{metric.label.toLowerCase()}</span>
                <span className="mx-1 text-brand-border">=</span>
                <span className="font-semibold text-brand-text">{metric.value}</span>
              </span>
            ))}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-brand-textMuted">status: ready</p>
        {action}
      </div>
    </header>
  );
}
