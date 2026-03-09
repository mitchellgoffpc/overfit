import type { ReactElement } from "react";
import { useEffect } from "react";
import { useParams } from "wouter";

import LineChart from "components/charts/LineChart";
import Navbar from "components/Navbar";
import Sidebar from "components/Sidebar";
import { useAuthStore } from "store/auth";
import { useProjectStore } from "store/projects";
import { useRunStore } from "store/runs";

const buildDummySeries = () => {
  const points = Array.from({ length: 140 }, (_, index) => {
    const step = index * 30;
    const decay = Math.exp(-index / 70);
    const wobble = Math.sin(index / 6) * 0.06;
    const loss = 2.4 * decay + 0.15 + wobble;
    return { x: step, y: Math.max(0.08, loss) };
  });

  return [{ id: "train_loss", points, color: "#1a7b7d", lineWidth: 2 }];
};

export default function RunDetailRoute(): ReactElement {
  const { projectId, runId } = useParams();
  const user = useAuthStore((state) => state.user);
  const projects = useProjectStore((state) => state.projects);
  const projectError = useProjectStore((state) => state.error);
  const isProjectsLoading = useProjectStore((state) => state.isLoading);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const runs = useRunStore((state) => state.runs);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);
  const fetchRuns = useRunStore((state) => state.fetchRuns);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (user) { void fetchRuns(user.id); }
  }, [fetchRuns, user]);

  const run = runs.find((item) => item.id === runId);
  const project = projects.find((item) => item.id === (projectId ?? run?.projectId));
  const series = buildDummySeries();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4f1f2_0%,_#f2f6f6_35%,_#f6f7fb_100%)] text-brand-text">
      <Navbar user={user} locationLabel={run?.name ?? "Run"} />

      <div className="lg:grid lg:grid-cols-[280px_1fr]">
        <Sidebar user={user} projects={projects} isLoading={isProjectsLoading} error={projectError} />

        <main className="p-6 lg:p-8">
          <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-brand-textMuted">{project?.name ?? "Project"}</p>
              <h1 className="mt-1 font-display text-3xl">{run?.name ?? "Run details"}</h1>
              <p className="mt-1 text-sm text-brand-textMuted">Live metrics and training history.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-brand-border bg-brand-surface px-4 py-2.5 font-semibold text-brand-text shadow-none" type="button">
                View logs
              </button>
              <button className="rounded-xl bg-brand-accent px-4 py-2.5 font-semibold text-white shadow-soft" type="button">
                Share run
              </button>
            </div>
          </header>

          {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">Run not found.</div> : null}
          {runError ? <div className="mb-4 py-3 text-[13px] text-brand-textMuted">{runError}</div> : null}

          <section className="rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl">train/loss</h2>
                <p className="mt-1 text-[13px] text-brand-textMuted">Step vs. loss value</p>
              </div>
              <div className="rounded-full bg-[#edf7f6] px-3 py-1 text-xs font-semibold text-brand-accentStrong">latest 0.18</div>
            </div>
            <LineChart className="h-[260px] w-full" series={series} height={260} xLabelFormatter={(value) => value.toFixed(0)} yLabelFormatter={(value) => value.toFixed(2)} />
          </section>
        </main>
      </div>
    </div>
  );
}
