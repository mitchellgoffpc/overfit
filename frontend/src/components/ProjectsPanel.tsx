import type { ReactElement } from "react";
import { useEffect } from "react";
import { useProjectStore } from "../store/projects";


export default function ProjectsPanel(): ReactElement {
  const projects = useProjectStore((state) => state.projects);
  const isLoading = useProjectStore((state) => state.isLoading);
  const error = useProjectStore((state) => state.error);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <h2 className="panel__title">Projects</h2>
          <p className="panel__subtitle">Search and manage all current experiments.</p>
        </div>
        <div className="panel__actions">
          <label className="search">
            <span className="search__icon">Search</span>
            <input className="search__input" placeholder="Search by project name" />
          </label>
          <div className="panel__pager">showing {projects.length}</div>
        </div>
      </div>

      {error ? <div className="panel__empty">{error}</div> : null}
      {!error && isLoading ? <div className="panel__empty">Loading projects...</div> : null}

      {!error && !isLoading ? (
        <div className="table">
          <div className="table__head">
            <span>Name</span>
            <span>Last Run</span>
            <span>Project Visibility</span>
            <span>Runs</span>
            <span>Traces</span>
          </div>
          {projects.map((project) => (
            <div className="table__row" key={project.id}>
              <div>
                <p className="table__name">{project.name}</p>
                <p className="table__description">{project.description ?? ""}</p>
              </div>
              <span className="table__muted">—</span>
              <span className="table__badge">Team</span>
              <span>0</span>
              <span>0</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
