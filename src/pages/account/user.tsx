import type { ReactElement } from "react";
import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";

import ProfileActivityHeatmap from "components/account/ProfileActivityHeatmap";
import ProfileProjectsPanel from "components/account/ProfileProjectsPanel";
import ProfileRunsPanel from "components/account/ProfileRunsPanel";
import ProfileSidebar from "components/account/ProfileSidebar";
import { useAuthStore } from "stores/auth";
import { fetchProjects, getUserProjects, useProjectStore } from "stores/projects";
import { fetchRuns, getUserRuns, useRunStore } from "stores/runs";
import type { User } from "types";

export default function UserPage({ user }: { readonly user: User }): ReactElement {
  const handle = user.handle;
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const projects = useProjectStore(useShallow(getUserProjects(handle)));
  const runError = useRunStore((state) => state.errors[handle] ?? null);
  const isRunsLoading = useRunStore((state) => state.isLoading[handle] ?? false);
  const runs = useRunStore(useShallow(getUserRuns(handle)));
  const currentHandle = useAuthStore((state) => state.currentHandle);

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [handle]);

  useEffect(() => {
    if (handle && !isProjectsLoading) { void fetchRuns(handle); }
  }, [handle, isProjectsLoading]);

  return (
    <>
      <ProfileSidebar user={user} projects={projects} runs={runs} isOwnProfile={handle === currentHandle} />
      <main className="relative min-w-0 px-4 pb-5 lg:px-5 lg:pb-6">
        <div className="grid">
          <ProfileProjectsPanel
            projects={projects}
            runs={runs}
            userHandle={handle}
            isLoading={isProjectsLoading}
            error={projectError}
          />
          <ProfileRunsPanel
            runs={runs}
            projects={projects}
            userHandle={handle}
            isLoading={isRunsLoading}
            error={runError}
          />
          <ProfileActivityHeatmap runs={runs} />
        </div>
      </main>
    </>
  );
}
