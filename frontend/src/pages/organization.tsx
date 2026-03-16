import type { Organization, Project } from "@underfit/types";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

import Navbar from "components/Navbar";
import { apiBase, formatDate } from "helpers";
import type { OrganizationMemberWithRole } from "stores/organizations";
import { fetchOrganizationMembers } from "stores/organizations";
import { useProjectStore } from "stores/projects";

interface OrganizationPageProps {
  readonly organization: Organization;
}

function MemberAvatar({ member }: { readonly member: OrganizationMemberWithRole }): ReactElement {
  const initials = member.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const avatarSrc = `${apiBase}/users/${encodeURIComponent(member.handle)}/avatar`;

  return (
    <Link href={`/${member.handle}`} title={member.name} className="no-underline">
      <div className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[#d9ecec] text-xs font-semibold text-brand-accentStrong">
        {initials}
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={avatarSrc}
          alt={member.name}
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      </div>
    </Link>
  );
}

function ProjectCard({ project, handle }: { readonly project: Project; readonly handle: string }): ReactElement {
  return (
    <Link
      className={"grid gap-2 rounded-[16px] border border-brand-border bg-brand-surfaceMuted p-4"
        + " text-inherit no-underline transition hover:border-brand-accent/40 hover:bg-[#eaf2f2]"}
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
  const [members, setMembers] = useState<OrganizationMemberWithRole[]>([]);
  const [search, setSearch] = useState("");
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const projectError = useProjectStore((state) => state.error);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const handle = organization.handle;

  const projects = useMemo(
    () => Object.values(projectsByKey).filter((project) => project.owner === handle),
    [projectsByKey, handle]
  );

  const filteredProjects = useMemo(() => {
    if (!search.trim()) { return projects; }
    const query = search.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query));
  }, [projects, search]);

  useEffect(() => {
    void fetchProjects(handle);
  }, [fetchProjects, handle]);

  useEffect(() => {
    void fetchOrganizationMembers(handle).then((result) => {
      if (result.ok) { setMembers(result.body); }
    });
  }, [handle]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: "Organization" }]} />

      <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
        <header className="mb-8 flex items-start gap-6">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-[#d9ecec] text-2xl font-bold text-brand-accentStrong">
            {organization.name.charAt(0).toUpperCase()}
          </div>
          <div className="grid gap-1">
            <h1 className="font-display text-3xl">{organization.name}</h1>
            <p className="text-sm text-brand-textMuted">@{handle}</p>
            <div className="mt-1 flex items-center gap-4 text-xs text-brand-textMuted">
              <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
              <span>{projects.length} {projects.length === 1 ? "project" : "projects"}</span>
              <span>Created {formatDate(organization.createdAt, { month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </header>

        <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-8">
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

            {projectError ? <div className="py-3 text-[13px] text-brand-textMuted">{projectError}</div> : null}
            {!projectError && isProjectsLoading
              ? <div className="py-3 text-[13px] text-brand-textMuted">Loading projects...</div>
              : null}

            {!projectError && !isProjectsLoading ? (
              filteredProjects.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-brand-border bg-brand-surfaceMuted px-4 py-6 text-[13px] text-brand-textMuted">
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
            <div className="rounded-[16px] border border-brand-border bg-brand-surface p-4">
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
