import type { ReactElement } from "react";
import { useEffect } from "react";

import { useProjectStore } from "store/projects";

export default function ProjectsPanel(): ReactElement {
  const projects = useProjectStore((state) => state.projects);
  const isLoading = useProjectStore((state) => state.isLoading);
  const error = useProjectStore((state) => state.error);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return (
    <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl">Projects</h2>
          <p className="mt-1.5 text-[13px] text-brand-textMuted">Search and manage all current experiments.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-xl border border-brand-border bg-brand-surfaceMuted px-3 py-2">
            <span className="text-xs text-brand-textMuted">Search</span>
            <input className="flex-1 bg-transparent text-[13px] outline-none" placeholder="Search by project name" />
          </label>
          <div className="text-xs text-brand-textMuted">showing {projects.length}</div>
        </div>
      </div>

      {error ? <div className="py-3 text-[13px] text-brand-textMuted">{error}</div> : null}
      {!error && isLoading ? <div className="py-3 text-[13px] text-brand-textMuted">Loading projects...</div> : null}

      {!error && !isLoading ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid gap-2">
            <div className="grid grid-cols-[2fr_1fr_1fr_0.5fr_0.5fr] items-center gap-3 border-b border-brand-border px-3 py-2 text-xs uppercase tracking-[0.08em] text-brand-textMuted">
              <span>Name</span>
              <span>Last Run</span>
              <span>Project Visibility</span>
              <span>Runs</span>
              <span>Traces</span>
            </div>
            {projects.map((project) => (
              <div className="grid grid-cols-[2fr_1fr_1fr_0.5fr_0.5fr] items-center gap-3 rounded-xl bg-brand-surfaceMuted px-3 py-2" key={project.id}>
                <div>
                  <p className="font-semibold">{project.name}</p>
                  <p className="mt-1 text-xs text-brand-textMuted">{project.description ?? ""}</p>
                </div>
                <span className="text-[13px] text-brand-textMuted">—</span>
                <span className="w-fit rounded-full bg-[#e1f2f2] px-2.5 py-1 text-xs text-brand-accentStrong">Organization</span>
                <span>0</span>
                <span>0</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
