import type { ReactElement } from "react";

const stepClass = "grid grid-cols-[32px_1fr] items-start gap-3 rounded-[14px] border border-transparent"
  + " bg-brand-surfaceMuted px-3.5 py-3 hover:border-brand-border";

export default function QuickstartGuide(): ReactElement {
  return (
    <div className="grid gap-4 px-1 pb-2 pt-3">
      <div className="grid gap-1.5">
        <h3 className="text-lg font-semibold">Quickstart: Track your first run</h3>
        <p className="text-[13px] text-brand-textMuted">Create a project, log a run, and watch metrics stream in.</p>
      </div>

      <div className={stepClass}>
        <div className="grid h-7 w-7 place-items-center rounded-[10px] bg-[#e1f2f2] text-[13px] font-semibold text-brand-accentStrong">1</div>
        <div>
          <p className="mb-2 font-semibold">Install the Underfit SDK</p>
          <div className="inline-block rounded-[10px] border border-brand-border bg-[#f3f7f6] px-2.5 py-2 font-mono text-xs">pip install underfit</div>
        </div>
      </div>

      <div className={stepClass}>
        <div className="grid h-7 w-7 place-items-center rounded-[10px] bg-[#e1f2f2] text-[13px] font-semibold text-brand-accentStrong">2</div>
        <div>
          <p className="mb-2 font-semibold">Authenticate with your workspace</p>
          <div className="inline-block rounded-[10px] border border-brand-border bg-[#f3f7f6] px-2.5 py-2 font-mono text-xs">underfit login</div>
        </div>
      </div>

      <div className={stepClass}>
        <div className="grid h-7 w-7 place-items-center rounded-[10px] bg-[#e1f2f2] text-[13px] font-semibold text-brand-accentStrong">3</div>
        <div>
          <p className="mb-2 font-semibold">Log your first run</p>
          <pre className="overflow-x-auto rounded-xl border border-brand-border bg-[#f3f7f6] p-3 text-xs">
            <code className="font-mono text-[#1b3a3b]">{`import underfit

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
