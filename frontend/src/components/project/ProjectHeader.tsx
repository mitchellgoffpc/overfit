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
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Lab Notebook</p>
      <h1 className="flex flex-wrap items-center gap-2.5 font-display text-[2.125rem] leading-none text-brand-text" style={{ height: RULED_LINE }}>
        <Avatar handle={handle} name={handle} className="border border-brand-borderStrong text-xs" style={{ width: RULED_LINE, height: RULED_LINE }} />
        <span>{projectName}</span>
      </h1>
    </div>
  );
}
