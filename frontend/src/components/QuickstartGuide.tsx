import type { ReactElement } from "react";

const stepClass = "grid grid-cols-[2rem_1fr] items-start gap-3 rounded-[0.875rem] border border-transparent"
  + " bg-brand-surfaceMuted px-3.5 py-3 hover:border-brand-border";

export default function QuickstartGuide(): ReactElement {
  return (
    <div className="grid gap-4 px-1 pb-2 pt-3">
      <div className="grid gap-1.5">
        <h3 className="text-lg font-semibold">Quickstart: Track your first run</h3>
        <p className="text-[0.8125rem] text-brand-textMuted">Create a project, log a run, and watch metrics stream in.</p>
      </div>

      <div className={stepClass}>
        <div className="grid h-7 w-7 place-items-center rounded-[0.625rem] bg-code-highlight text-[0.8125rem] font-semibold text-brand-accentStrong">1</div>
        <div>
          <p className="mb-2 font-semibold">Install the Underfit SDK</p>
          <div className="inline-block rounded-[0.625rem] border border-brand-border bg-code-bg px-2.5 py-2 font-mono text-xs">pip install underfit</div>
        </div>
      </div>

      <div className={stepClass}>
        <div className="grid h-7 w-7 place-items-center rounded-[0.625rem] bg-code-highlight text-[0.8125rem] font-semibold text-brand-accentStrong">2</div>
        <div>
          <p className="mb-2 font-semibold">Authenticate with your workspace</p>
          <div className="inline-block rounded-[0.625rem] border border-brand-border bg-code-bg px-2.5 py-2 font-mono text-xs">underfit login</div>
        </div>
      </div>

      <div className={stepClass}>
        <div className="grid h-7 w-7 place-items-center rounded-[0.625rem] bg-code-highlight text-[0.8125rem] font-semibold text-brand-accentStrong">3</div>
        <div>
          <p className="mb-2 font-semibold">Log your first run</p>
          <pre className="overflow-x-auto rounded-xl border border-brand-border bg-code-bg p-3 text-xs">
            <code className="font-mono text-code-text">{`import underfit

run = underfit.init(project="vision-baseline")
run.log({"accuracy": 0.92, "loss": 0.18})
run.finish()`}</code>
          </pre>
        </div>
      </div>

      <div className="text-xs text-brand-textMuted">
        Tip: runs show up here as soon as they start streaming.
      </div>
    </div>
  );
}
