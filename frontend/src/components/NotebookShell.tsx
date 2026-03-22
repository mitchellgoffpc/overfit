import type { CSSProperties, ReactElement, ReactNode } from "react";

import { RULED_LINE } from "helpers";

interface NotebookShellProps {
  readonly columns?: string;
  readonly maxWidth?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export default function NotebookShell({ columns, maxWidth, className, children }: NotebookShellProps): ReactElement {
  const baseClass = "relative mx-auto w-full overflow-hidden border-x border-b border-[#c4d1d1]"
    + " bg-[#f8fcfa] shadow-[0_0.875rem_2.25rem_rgba(30,52,52,0.18)]";
  const gridClass = columns ? " lg:grid" : "";
  const style: CSSProperties = {};
  if (columns) { style.gridTemplateColumns = columns; }
  if (maxWidth) { style.maxWidth = maxWidth; }

  return (
    <div className={`${baseClass}${gridClass}${className ? ` ${className}` : ""}`} style={style}>
      <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[0.875rem] bg-[#dce7e4]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.2) 1px, transparent 1px)", backgroundSize: `100% ${RULED_LINE}` }}
      />
      <div className="pointer-events-none absolute bottom-0 left-10 top-0 w-px bg-[#efb1b1]/70" aria-hidden />
      {children}
    </div>
  );
}
