import type { User } from "@overfit/types";
import type { ReactElement } from "react";

interface SidebarProps {
  readonly user: User;
}

export default function Sidebar({ user }: SidebarProps): ReactElement {
  return (
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
          Organization settings
        </button>
        <button className="sidebar__nav-item" type="button">
          Registry
        </button>
      </nav>
      <div className="sidebar__members">
        <p className="sidebar__members-title">Members (1)</p>
        <button className="sidebar__members-action" type="button">
          Invite organization members
        </button>
        <div className="sidebar__member">
          <span className="sidebar__member-avatar">MG</span>
          <span className="sidebar__member-name">{user.displayName}</span>
        </div>
      </div>
    </aside>
  );
}
