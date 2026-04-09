import type { ReactElement } from "react";
import { Link } from "wouter";

import Avatar from "components/Avatar";
import { RULED_LINE, RULED_LINE_HEIGHT, formatDate } from "helpers";
import type { OrganizationMember } from "stores/accounts";
import type { Organization } from "types";

interface OrganizationSidebarProps {
  readonly organization: Organization;
  readonly members: OrganizationMember[];
  readonly projectCount: number;
}

export default function OrganizationSidebar({ organization, members, projectCount }: OrganizationSidebarProps): ReactElement {
  return (
    <aside
      className="relative flex h-full flex-col gap-4 border-b border-brand-borderMuted px-4 pb-5 lg:border-b-0 lg:border-r lg:pb-6 lg:pr-5"
      style={{ paddingTop: `${String(RULED_LINE_HEIGHT)}rem` }}
    >
      <div>
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Org Ledger</p>
        <h2 className="font-display text-brand-text" style={{ fontSize: RULED_LINE, lineHeight: RULED_LINE }}>Organization</h2>
      </div>
      <div className="grid gap-4 rounded-2xl border border-brand-borderMuted bg-white/85 p-4">
        <div className="grid h-20 w-20 place-items-center rounded-xl bg-brand-accentMuted text-2xl font-bold text-brand-accentStrong">
          {organization.name.charAt(0).toUpperCase()}
        </div>
        <div className="grid gap-1">
          <h1 className="font-display text-2xl">{organization.name}</h1>
          <p className="text-sm text-brand-textMuted">@{organization.handle}</p>
        </div>
        <div className="grid gap-1 text-xs text-brand-textMuted">
          <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
          <span>{projectCount} {projectCount === 1 ? "project" : "projects"}</span>
          <span>Created {formatDate(organization.createdAt, { month: "short", year: "numeric" })}</span>
        </div>
      </div>
      <div className="rounded-2xl border border-brand-borderMuted bg-white/85 p-4">
        <h3 className="mb-3 text-sm font-semibold">People</h3>
        {members.length === 0 ? (
          <p className="text-xs text-brand-textMuted">No members.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <Link href={`/${member.handle}`} title={member.name} className="no-underline" key={member.handle}>
                <Avatar handle={member.handle} name={member.name} className="h-9 w-9 text-xs" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
