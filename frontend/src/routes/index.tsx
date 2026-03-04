import type { Project, User } from "@overfit/types";
import type { ReactElement } from "react";
import { useMemo } from "react";


type ProjectRow = Project & {
  lastRun: string;
  visibility: "Team" | "Private";
  runs: number;
  traces: number;
};

const FALLBACK_USER: User = {
  id: "user-mitchell",
  email: "mitchell@overfit.local",
  displayName: "mitchellgoffpc",
  createdAt: "2024-05-20T16:20:00Z",
  updatedAt: "2024-10-12T09:15:00Z"
};

const FALLBACK_PROJECTS: ProjectRow[] = [
  {
    id: "project-shortcut",
    name: "shortcut",
    description: "Fast iteration experiments for shortcut models.",
    createdAt: "2024-09-15T15:30:00Z",
    updatedAt: "2024-10-19T10:12:00Z",
    lastRun: "2024-10-19",
    visibility: "Team",
    runs: 2,
    traces: 0
  },
  {
    id: "project-iris",
    name: "iris",
    description: "Iris classification baseline with feature sweeps.",
    createdAt: "2024-08-22T12:12:00Z",
    updatedAt: "2024-09-06T08:05:00Z",
    lastRun: "2024-09-06",
    visibility: "Team",
    runs: 5,
    traces: 0
  }
];

export default function IndexRoute(): ReactElement {
  const projects = useMemo(() => FALLBACK_PROJECTS, []);
  const user = useMemo(() => FALLBACK_USER, []);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__logo">o</div>
        <div className="sidebar__user">
          <div className="sidebar__avatar">MG</div>
          <div>
            <p className="sidebar__user-name">{user.displayName}</p>
            <p className="sidebar__user-email">{user.email}</p>
          </div>
        </div>
        <div className="sidebar__org">
          <p className="sidebar__org-title">{user.displayName}-projects</p>
          <button className="sidebar__org-action" type="button">
            Share
          </button>
        </div>
        <nav className="sidebar__nav">
          <button className="sidebar__nav-item" type="button">
            Team settings
          </button>
          <button className="sidebar__nav-item" type="button">
            Registry
          </button>
        </nav>
        <div className="sidebar__members">
          <p className="sidebar__members-title">Members (1)</p>
          <button className="sidebar__members-action" type="button">
            Invite team members
          </button>
          <div className="sidebar__member">
            <span className="sidebar__member-avatar">MG</span>
            <span className="sidebar__member-name">{user.displayName}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="main__header">
          <div>
            <p className="main__kicker">mitchellgoffpc-projects</p>
            <h1 className="main__title">Projects</h1>
          </div>
          <button className="main__cta" type="button">
            + New project
          </button>
        </header>

        <div className="tabs">
          <button className="tabs__item">Overview</button>
          <button className="tabs__item">Reports</button>
          <button className="tabs__item tabs__item--active">Projects</button>
          <button className="tabs__item">Users</button>
          <button className="tabs__item">Service Accounts</button>
          <button className="tabs__item">Settings</button>
        </div>

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
                  <p className="table__description">{project.description}</p>
                </div>
                <span className="table__muted">{project.lastRun}</span>
                <span className="table__badge">{project.visibility}</span>
                <span>{project.runs}</span>
                <span>{project.traces}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
