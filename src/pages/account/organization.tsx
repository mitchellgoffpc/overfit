import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import OrganizationProjectCard from "components/account/OrganizationProjectCard";
import OrganizationSidebar from "components/account/OrganizationSidebar";
import { fetchOrganizationMembers, getOrganizationMembers, useAccountsStore } from "stores/accounts";
import { fetchProjects, getUserProjects, useProjectStore } from "stores/projects";
import type { Organization } from "types";

export default function OrganizationPage({ organization }: { readonly organization: Organization }): ReactElement {
  const [search, setSearch] = useState("");
  const handle = organization.handle;
  const members = useAccountsStore(useShallow(getOrganizationMembers(handle)));
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const projectError = useProjectStore((state) => state.error);
  const projectsList = useProjectStore(useShallow(getUserProjects(handle)));

  const filteredProjects = useMemo(() => {
    if (!search.trim()) { return projectsList; }
    const query = search.toLowerCase();
    return projectsList.filter((p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query));
  }, [projectsList, search]);

  useEffect(() => {
    void fetchProjects(handle);
    void fetchOrganizationMembers(handle);
  }, [handle]);

  return (
    <>
      <OrganizationSidebar organization={organization} members={members} projectCount={projectsList.length} />
      <main className="relative min-w-0 px-4 pb-5 lg:px-5 lg:pb-6">
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
        {!projectError && isProjectsLoading ? <div className="py-3 text-[0.8125rem] text-brand-textMuted">Loading projects...</div> : null}
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
                <OrganizationProjectCard key={project.id} project={project} handle={handle} />
              ))}
            </div>
          )
        ) : null}
      </main>
    </>
  );
}
