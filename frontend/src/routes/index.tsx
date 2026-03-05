import type { User } from "@overfit/types";
import type { ReactElement } from "react";
import { useMemo } from "react";

import ProjectsPanel from "components/ProjectsPanel";
import Sidebar from "components/Sidebar";
import TabBar from "components/TabBar";

const FALLBACK_USER: User = {
  id: "user-mitchell",
  email: "mitchell@overfit.local",
  username: "mitchellgoffpc",
  createdAt: "2024-05-20T16:20:00Z",
  updatedAt: "2024-10-12T09:15:00Z"
};

export default function IndexRoute(): ReactElement {
  const user = useMemo(() => FALLBACK_USER, []);

  return (
    <div className="layout">
      <Sidebar user={user} />

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

        <TabBar activeTab="Projects" tabs={["Overview", "Reports", "Projects", "Users", "Service Accounts", "Settings"]} />

        <ProjectsPanel />
      </main>
    </div>
  );
}
