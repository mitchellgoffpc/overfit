import type { ReactElement } from "react";
import { useParams } from "wouter";

import SectionHeader from "components/SectionHeader";
import { useRunStore } from "stores/runs";

export default function RunArtifactsPage(): ReactElement {
  const { handle, projectName, runName } = useParams<{ handle: string; projectName: string; runName: string }>();
  const run = useRunStore((state) => state.runsByKey[`${handle}/${projectName}/${runName}`]);
  const runError = useRunStore((state) => state.error);
  const isRunsLoading = useRunStore((state) => state.isLoading);

  return (
    <main className="relative p-[1.5rem]">
      <SectionHeader title="Artifacts" subtitle="stored outputs" />
      {!run && !isRunsLoading ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError ?? "Run not found."}</div> : null}
      {run && runError ? <div className="mb-4 py-3 text-[0.8125rem] text-brand-textMuted">{runError}</div> : null}
      <section
        className={"rounded-[0.875rem] border border-[#d2dede] bg-white/90 p-4 text-[0.8125rem]"
          + " text-brand-textMuted shadow-[0_0.5rem_1.25rem_rgba(23,43,43,0.06)]"}
      >
        Artifacts coming soon.
      </section>
    </main>
  );
}
