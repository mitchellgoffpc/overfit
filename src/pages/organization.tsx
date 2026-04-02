import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useShallow } from "zustand/react/shallow";

import Avatar from "components/Avatar";
import Navbar from "components/Navbar";
import { formatDate } from "helpers";
import type { OrganizationMember } from "stores/accounts";
import { fetchOrganizationMembers, getOrganizationMembers, useAccountsStore } from "stores/accounts";
import { fetchProjects, useProjectStore } from "stores/projects";
import type { Organization, Project } from "types";

interface OrganizationPageProps {
  readonly organization: Organization;
}

function MemberAvatar({ member }: { readonly member: OrganizationMember }): ReactElement {
  return (
    <Link href={`/${member.handle}`} title={member.name} className="no-underline">
      <Avatar handle={member.handle} name={member.name} className="h-9 w-9 text-xs" />
    </Link>
  );
}

function ProjectCard({ project, handle }: { readonly project: Project; readonly handle: string }): ReactElement {
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

export default function OrganizationPage({ organization }: OrganizationPageProps): ReactElement {
  const [search, setSearch] = useState("");
  const handle = organization.handle;
  const members = useAccountsStore(useShallow(getOrganizationMembers(handle)));
  const projects = useProjectStore((state) => state.projects);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const projectError = useProjectStore((state) => state.error);

  const projectsList = useMemo(
    () => Object.values(projects).filter((project) => project.owner === handle),
    [projects, handle]
  );

  const filteredProjects = useMemo(() => {
    if (!search.trim()) { return projectsList; }
    const query = search.toLowerCase();
    return projectsList.filter((p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query));
  }, [projectsList, search]);

  useEffect(() => {
    void fetchProjects(handle);
  }, [handle]);

  useEffect(() => {
    void fetchOrganizationMembers(handle);
  }, [handle]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: "Organization" }]} />

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <header className="mb-8 flex items-start gap-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-brand-accentMuted text-2xl font-bold text-brand-accentStrong">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          <div className="grid gap-1">
            <h1 className="font-display text-3xl">{organization.name}</h1>
            <p className="text-sm text-brand-textMuted">@{handle}</p>
            <div className="mt-1 flex items-center gap-4 text-xs text-brand-textMuted">
              <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
              <span>{projectsList.length} {projectsList.length === 1 ? "project" : "projects"}</span>
              <span>Created {formatDate(organization.createdAt, { month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[1fr_16.25rem] lg:gap-8">
          <main>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl">Projects</h2>
              <span className="text-xs text-brand-textMuted">{filteredProjects.length} results</span>
            </div>

            <input
              className={"mb-5 w-full rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 text-sm"
                + " text-brand-text placeholder:text-brand-textMuted focus:border-brand-accent focus:outline-none"}
              type="text"
              placeholder="Find a project..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
            />

            {projectError ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">{projectError}</div> : null}
            {!projectError && isProjectsLoading
              ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">Loading projects...</div>
              : null}

            {!projectError && !isProjectsLoading ? (
              filteredProjects.length === 0 ? (
                <div
                  className={"rounded-[0.875rem] border border-dashed border-brand-border bg-brand-surfaceMuted"
                    + " px-4 py-6 text-[0.8125rem] text-brand-textMuted"}
                >
                  {search ? "No projects match your search." : "No projects yet."}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard key={project.id} project={project} handle={handle} />
                  ))}
                </div>
              )
            ) : null}
          </main>

          <aside className="mt-8 lg:mt-0">
            <div className="rounded-2xl border border-brand-border bg-brand-surface p-4">
              <h3 className="mb-3 text-sm font-semibold">People</h3>
              {members.length === 0 ? (
                <p className="text-xs text-brand-textMuted">No members.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {members.map((member) => (
                    <MemberAvatar key={member.id} member={member} />
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
