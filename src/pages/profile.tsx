import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";
import { useShallow } from "zustand/react/shallow";

import Navbar from "components/Navbar";
import NotebookShell from "components/NotebookShell";
import ProfileActivityHeatmap from "components/profile/ProfileActivityHeatmap";
import ProfileProjectsPanel from "components/profile/ProfileProjectsPanel";
import ProfileRunsPanel from "components/profile/ProfileRunsPanel";
import ProfileSidebar from "components/profile/ProfileSidebar";
import NotFoundPage from "pages/not-found";
import OrganizationPage from "pages/organization";
import { fetchAccount, useAccountsStore } from "stores/accounts";
import { useAuthStore } from "stores/auth";
import { fetchProjects, getUserProjects, useProjectStore } from "stores/projects";
import { fetchRuns, getUserRuns, useRunStore } from "stores/runs";

export default function ProfileRoute(): ReactElement {
  const { handle } = useParams<{ handle: string }>();
  const account = useAccountsStore((state) => state.accounts[handle]);
  const notFound = useAccountsStore((state) => state.notFoundHandles.has(handle));
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const projects = useProjectStore(useShallow(getUserProjects(handle)));
  const runError = useRunStore((state) => state.errors[handle] ?? null);
  const isRunsLoading = useRunStore((state) => state.isLoading[handle] ?? false);
  const runs = useRunStore(useShallow(getUserRuns(handle)));
  const currentHandle = useAuthStore((state) => state.currentHandle);
  const user = account?.type === "USER" ? account : null;
  const organization = account?.type === "ORGANIZATION" ? account : null;

  useEffect(() => {
    if (!account && !notFound) { void fetchAccount(handle); }
  }, [account, handle, notFound]);

  useEffect(() => {
    if (handle) { void fetchProjects(handle); }
  }, [handle]);

  useEffect(() => {
    if (handle && !isProjectsLoading) { void fetchRuns(handle); }
  }, [handle, isProjectsLoading]);

  if (notFound) { return <NotFoundPage />; }
  if (!account) { return <div />; }
  if (organization) { return <OrganizationPage organization={organization} />; }

  return (
    <div className="min-h-screen bg-brand-bgStrong text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: "Profile" }]} />

      <NotebookShell columns="18.75rem 1fr" className="max-w-7xl">
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
      </NotebookShell>
    </div>
  );
}
