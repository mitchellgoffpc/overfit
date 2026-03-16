import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import Navbar from "components/Navbar";
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
  const projects = Object.values(projectsByKey).filter((project) => project.owner === handle);
  const runs = Object.values(runsByKey).filter((run) => run.projectOwner === handle);

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: "Profile" }]} />

      <div className="mx-auto w-full max-w-6xl lg:grid lg:grid-cols-[280px_1fr]">
        <ProfileSidebar user={user} projects={projects} runs={runs} isOwnProfile={handle === currentHandle} />

        <main className="p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{handle}</p>
              <h1 className="mt-1 font-display text-3xl">Profile</h1>
              <p className="mt-2 text-[13px] text-brand-textMuted">A snapshot of your experiments, projects, and recent work.</p>
            </div>
          </header>

          <div className="grid gap-5">
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
      </div>
    </div>
  );
}
