import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import ProfileActivityHeatmap from "components/profile/ProfileActivityHeatmap";
import ProfileProjectsPanel from "components/profile/ProfileProjectsPanel";
import ProfileRunsPanel from "components/profile/ProfileRunsPanel";
import ProfileSidebar from "components/profile/ProfileSidebar";
import NotFoundPage from "pages/not-found";
import OrganizationPage from "pages/organization";
import { useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";
import { useProjectStore } from "stores/projects";
import { useRunStore } from "stores/runs";

export default function ProfileRoute(): ReactElement {
  const { handle } = useParams<{ handle: string }>();
  const account = useAccountsStore((state) => state.accounts[handle]);
  const notFound = useAccountsStore((state) => state.notFoundHandles.has(handle));
  const fetchAccount = useAccountsStore((state) => state.fetchAccount);
  const projectsByKey = useProjectStore((state) => state.projectsByKey);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runsByKey = useRunStore((state) => state.runsByKey);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);
  const currentHandle = useAuthStore((state) => state.currentHandle);
  const user = account?.type === "USER" ? account : null;
  const organization = account?.type === "ORGANIZATION" ? account : null;
  const projects = Object.values(projectsByKey).filter((project) => project.owner === handle).sort((a, b) => a.name.localeCompare(b.name));
  const runs = Object.values(runsByKey).filter((run) => run.projectOwner === handle).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  useEffect(() => {
    if (!account && !notFound) { void fetchAccount(handle); }
  }, [account, fetchAccount, handle, notFound]);

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [fetchProjects, handle]);

  useEffect(() => {
    if (handle && !isProjectsLoading) { void fetchRuns(handle); }
  }, [fetchRuns, handle, isProjectsLoading]);

  if (notFound) { return <NotFoundPage />; }
  if (!account) { return <div />; }
  if (organization) { return <OrganizationPage organization={organization} />; }

  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: "Profile" }]} />

      <NotebookShell columns="18.75rem 1fr" className="max-w-7xl">
        <ProfileSidebar user={user} projects={projects} runs={runs} isOwnProfile={handle === currentHandle} />

        <main className="relative min-w-0 px-4 pb-5 lg:px-5 lg:pb-6">
          <div className="grid gap-6">
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
      </NotebookShell>
    </div>
  );
}
