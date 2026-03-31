import type { ReactElement } from "react";
import { useState } from "react";
import { useLocation } from "wouter";

import SectionHeader from "components/SectionHeader";
import { RULED_LINE } from "helpers";
import { dangerButtonClass, inkButtonClass, lineInputClass, paperButtonClass } from "pages/settings/styles";
import { updateProject } from "stores/projects";
import type { Project, ProjectVisibility } from "types";

interface GeneralSettingsProps {
  readonly project: Project;
}

export default function GeneralSettings({ project }: GeneralSettingsProps): ReactElement {
  const [, navigate] = useLocation();
  const [description, setDescription] = useState(() => project.description ?? "");
  const [visibility, setVisibility] = useState<ProjectVisibility>(() => project.visibility);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const hasChanges = description !== (project.description ?? "") || visibility !== project.visibility;

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setStatus(null);
    const result = await updateProject(project.owner, project.name, { description: description || null, visibility });
    if (result.ok) {
      setStatus("Settings saved");
      if (result.body.name !== project.name) { navigate(`/${result.body.owner}/${result.body.name}/settings/general`); }
    } else {
      setError(result.error);
    }
    setIsSaving(false);
  };

  const visibilityOptions: { value: ProjectVisibility; label: string; description: string }[] = [
    { value: "private", label: "Private", description: "Only you and collaborators can see this project." },
    { value: "public", label: "Public", description: "Anyone can see this project. Only you and collaborators can log runs." },
  ];

  return (
    <div>
      <SectionHeader title="General" subtitle={`${project.owner}/${project.name}`} sectionLabel="Section A" />

      <div className="flex flex-wrap gap-2" style={{ marginTop: RULED_LINE }}>
        {error ? (
          <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text">{error}</div>
        ) : null}
        {status ? (
          <div className="rounded-[0.625rem] border border-success-border bg-success-bg px-3 py-1.5 text-xs text-success-text">{status}</div>
        ) : null}
      </div>

      <div className="grid gap-5" style={{ marginTop: RULED_LINE }}>
        <label className="grid gap-1 text-sm text-brand-text">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Project name</span>
          <input className={lineInputClass + " bg-brand-bgStrong/30 text-brand-textMuted"} type="text" value={project.name} disabled />
          <span className="text-[0.6875rem] text-brand-textMuted">Project renaming is not yet supported.</span>
        </label>

        <label className="grid gap-1 text-sm text-brand-text">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Description</span>
          <textarea
            className={"min-h-20 w-full rounded-[0.625rem] border border-brand-borderMuted bg-white/70 px-3 py-2.5"
              + " text-sm outline-none transition focus:border-brand-accent"}
            value={description}
            placeholder="What is this project about?"
            onChange={(e) => { setDescription(e.target.value); }}
          />
        </label>

        <div className="grid gap-2">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted">Visibility</span>
          <div className="grid gap-2">
            {visibilityOptions.map((opt) => (
              <label
                key={opt.value}
                className={"flex cursor-pointer items-start gap-3 rounded-[0.625rem] border px-4 py-3 transition"
                  + (visibility === opt.value
                    ? " border-brand-accent bg-brand-accentMuted/30"
                    : " border-brand-borderMuted bg-white/50 hover:border-brand-borderStrong")}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.value}
                  checked={visibility === opt.value}
                  onChange={() => { setVisibility(opt.value); }}
                  className="mt-0.5 accent-brand-accent"
                />
                <div>
                  <p className="text-sm font-semibold text-brand-text">{opt.label}</p>
                  <p className="text-[0.6875rem] text-brand-textMuted">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button className={inkButtonClass} type="button" disabled={isSaving || !hasChanges} onClick={() => { void handleSave(); }}>
            {isSaving ? "Saving..." : "Save changes"}
          </button>
          {hasChanges ? (
            <button
              className={paperButtonClass}
              type="button"
              onClick={() => { setDescription(project.description ?? ""); setVisibility(project.visibility); setError(null); setStatus(null); }}
            >
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-10 rounded-[0.625rem] border border-danger-border/50 p-5">
        <h3 className="text-sm font-semibold text-danger-text">Danger zone</h3>
        <p className="mt-1 text-[0.6875rem] text-brand-textMuted">Deleting a project is permanent and cannot be undone.</p>
        <button className={dangerButtonClass + " mt-3"} type="button" disabled>Delete project</button>
      </div>
    </div>
  );
}
