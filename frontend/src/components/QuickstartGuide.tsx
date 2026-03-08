import type { ReactElement } from "react";

export default function QuickstartGuide(): ReactElement {
  return (
    <div className="quickstart">
      <div className="quickstart__header">
        <h3 className="quickstart__title">Quickstart: Track your first run</h3>
        <p className="quickstart__subtitle">Create a project, log a run, and watch metrics stream in.</p>
      </div>

      <div className="quickstart__step">
        <div className="quickstart__badge">1</div>
        <div>
          <p className="quickstart__step-title">Install the Underfit SDK</p>
          <div className="quickstart__code">pip install underfit</div>
        </div>
      </div>

      <div className="quickstart__step">
        <div className="quickstart__badge">2</div>
        <div>
          <p className="quickstart__step-title">Authenticate with your workspace</p>
          <div className="quickstart__code">underfit login</div>
        </div>
      </div>

      <div className="quickstart__step">
        <div className="quickstart__badge">3</div>
        <div>
          <p className="quickstart__step-title">Log your first run</p>
          <pre className="quickstart__snippet">
            <code>{`import underfit

run = underfit.init(project="vision-baseline")
run.log({"accuracy": 0.92, "loss": 0.18})
run.finish()`}</code>
          </pre>
        </div>
      </div>

      <div className="quickstart__footer">
        Tip: runs show up here as soon as they start streaming.
      </div>
    </div>
  );
}
