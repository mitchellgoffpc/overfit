import type { ReactElement } from "react";

import Avatar from "components/Avatar";
import { RULED_LINE } from "helpers";

interface ProjectHeaderProps {
  readonly handle: string;
  readonly projectName: string;
}

export default function ProjectHeader({ handle, projectName }: ProjectHeaderProps): ReactElement {
  return (
    <div>
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Project Ledger</p>
      <h1 className="flex flex-wrap items-center gap-2.5 font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>
        <Avatar handle={handle} name={handle} className="text-xs" style={{ width: `calc(${RULED_LINE} * 0.8)`, height: `calc(${RULED_LINE} * 0.8)` }} />
        <span>{projectName}</span>
      </h1>
    </div>
  );
}
