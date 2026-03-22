import type { ReactElement } from "react";

import { apiBase } from "helpers";

interface ProjectHeaderProps {
  readonly handle: string;
  readonly projectName: string;
}

export default function ProjectHeader({ handle, projectName }: ProjectHeaderProps): ReactElement {
  const ownerInitial = handle[0]?.toUpperCase() ?? "?";
  const ownerAvatarSrc = `${apiBase}/accounts/${encodeURIComponent(handle)}/avatar`;

  return (
    <div>
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
      <h1 className="mt-1 flex flex-wrap items-center gap-2.5 font-display text-[2.125rem] leading-none text-brand-text">
        <div
          className={[
            "relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-brand-borderStrong",
            "bg-brand-accentMuted text-xs font-semibold text-brand-accentStrong"
          ].join(" ")}
        >
          {ownerInitial}
          <img
            className="absolute inset-0 h-full w-full object-cover"
            src={ownerAvatarSrc}
            alt={`${handle} avatar`}
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        </div>
        <span>{projectName}</span>
      </h1>
    </div>
  );
}
