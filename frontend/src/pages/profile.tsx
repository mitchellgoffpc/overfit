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
  const notebookShellClass = "relative mx-auto w-full max-w-7xl overflow-hidden border-x border-b border-[#c4d1d1]"
    + " bg-[#f8fcfa] shadow-[0_14px_36px_rgba(30,52,52,0.18)] lg:grid lg:grid-cols-[300px_1fr]";

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
    <div className="min-h-screen bg-[#e9efed] text-brand-text">
      <Navbar breadcrumbs={[{ label: handle, href: `/${handle}` }, { label: "Profile" }]} />

      <div className={notebookShellClass}>
        <div className="pointer-events-none absolute -inset-x-6 -inset-y-4 -z-10 rounded-[14px] bg-[#dce7e4]" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(96,125,139,0.2) 1px, transparent 1px)", backgroundSize: "100% 30px" }}
        />
        <div className="pointer-events-none absolute bottom-0 left-10 top-0 w-px bg-[#efb1b1]/70" aria-hidden />

        <ProfileSidebar user={user} projects={projects} runs={runs} isOwnProfile={handle === currentHandle} />

        <main className="relative p-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d4dfdf] pb-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand-textMuted">Lab Notebook</p>
              <h1 className="mt-1 font-display text-[34px] leading-none text-brand-text">Profile Record</h1>
            </div>
            <p className="font-mono text-[11px] text-brand-textMuted">@{handle} / experiments</p>
          </div>

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
