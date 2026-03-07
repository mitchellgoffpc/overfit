import type { Project, User } from "@overfit/types";
import type { ReactElement } from "react";

interface SidebarProps {
  readonly user: User;
  readonly projects: Project[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export default function Sidebar({ user, projects, isLoading, error }: SidebarProps): ReactElement {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">o</div>
        <div>
          <p className="sidebar__brand-title">Overfit</p>
          <p className="sidebar__brand-subtitle">Workspace</p>
        </div>
      </div>

      <label className="search search--sidebar">
        <span className="search__icon">Search</span>
        <input className="search__input" placeholder="Find a project" />
      </label>

      <div className="sidebar__section">
        <div className="sidebar__section-header">
          <p className="sidebar__section-title">Top projects</p>
          <button className="sidebar__section-action" type="button">
            New
          </button>
        </div>
        {error ? <div className="sidebar__empty">{error}</div> : null}
        {!error && isLoading ? <div className="sidebar__empty">Loading projects...</div> : null}
        {!error && !isLoading ? (
          <div className="sidebar__projects">
            {projects.map((project) => (
              <button className="sidebar__project" type="button" key={project.id}>
                <span className="sidebar__project-icon">{project.name.slice(0, 1).toUpperCase()}</span>
                <span className="sidebar__project-text">
                  <span className="sidebar__project-name">{project.name}</span>
                  <span className="sidebar__project-meta">{user.handle}/{project.name}</span>
                </span>
              </button>
            ))}
            {projects.length === 0 ? <div className="sidebar__empty">No projects yet.</div> : null}
          </div>
        ) : null}
      </div>

      <div className="sidebar__profile">
        <div className="sidebar__avatar">{user.displayName.slice(0, 2).toUpperCase()}</div>
        <div>
          <p className="sidebar__user-name">{user.displayName}</p>
          <p className="sidebar__user-email">{user.email}</p>
        </div>
      </div>
    </aside>
  );
}
