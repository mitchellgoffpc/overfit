import type { ReactElement } from "react";
import { Link } from "wouter";

import { formatDate } from "helpers";
import type { Project } from "types";

interface OrganizationProjectCardProps {
  readonly project: Project;
  readonly handle: string;
}

export default function OrganizationProjectCard({ project, handle }: OrganizationProjectCardProps): ReactElement {
  return (
    <Link
      className={"grid gap-2 rounded-2xl border border-brand-border bg-brand-surfaceMuted p-4"
        + " text-inherit no-underline transition hover:border-brand-accent/40 hover:bg-hover"}
      href={`/${handle}/${project.name}`}
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-brand-accent">{project.name}</p>
      </div>
      <p className="text-xs text-brand-textMuted">{project.description ?? "No description yet."}</p>
      <p className="text-xs text-brand-textMuted">Updated {formatDate(project.updatedAt)}</p>
    </Link>
  );
}
