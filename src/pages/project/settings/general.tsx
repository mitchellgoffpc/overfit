import type { ReactElement } from "react";
import { useState } from "react";
import { useLocation } from "wouter";

import TextAreaField from "components/fields/TextAreaField";
import TextInputField from "components/fields/TextInputField";
import Modal from "components/Modal";
import SectionHeader from "components/SectionHeader";
import { RULED_LINE, RULED_LINE_HEIGHT } from "helpers";
import { dangerButtonClass, inkButtonClass, lineInputClass, paperButtonClass } from "pages/settings/styles";
import { deleteProject, updateProject } from "stores/projects";
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"warning" | "confirm">("warning");
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges = description !== (project.description ?? "") || visibility !== project.visibility;
  const deleteTarget = `${project.owner}/${project.name}`;
  const deleteConfirmed = deleteInput === deleteTarget;
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

  const openDeleteModal = () => {
    setDeleteStep("warning");
    setDeleteInput("");
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmed) { setDeleteError(`Type "${deleteTarget}" to confirm.`); return; }
    setIsDeleting(true);
    setDeleteError(null);
    const result = await deleteProject(project.owner, project.name);
    if (result.ok) {
      navigate(`/${project.owner}`);
      return;
    }
    setDeleteError(result.error);
    setIsDeleting(false);
  };

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

      <div className="grid" style={{ gap: RULED_LINE }}>
        <TextInputField
          label="Project name"
          type="text"
          value={project.name}
          hint="Project renaming is not yet supported."
          disabled
        />

        <TextAreaField
          label="Description"
          value={description}
          placeholder="What is this project about?"
          onChange={(e) => { setDescription(e.target.value); }}
        />

        <div className="grid">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-brand-textMuted" style={{ lineHeight: RULED_LINE }}>Visibility</span>
          <div className="grid gap-2" style={{ marginTop: `-${String(RULED_LINE_HEIGHT / 8)}rem` }}>
            {visibilityOptions.map((opt) => (
              <label
                key={opt.value}
                className={"flex cursor-pointer items-start gap-3 rounded-[0.625rem] border px-4 py-3 transition"
                  + (visibility === opt.value
                    ? " border-brand-accent bg-brand-accentMuted"
                    : " border-brand-borderMuted bg-white hover:border-brand-borderStrong")}
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
          <button
            className={inkButtonClass + " disabled:cursor-not-allowed"}
            type="button"
            disabled={isSaving || !hasChanges}
            onClick={() => { void handleSave(); }}
          >
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

      <div className="mt-10 rounded-[0.625rem] border border-danger-border/50 bg-white p-5">
        <h3 className="text-sm font-semibold text-danger-text">Danger zone</h3>
        <p className="mt-1 text-[0.6875rem] text-brand-textMuted">Deleting a project is permanent and cannot be undone.</p>
        <button className={dangerButtonClass + " mt-3"} type="button" onClick={openDeleteModal}>Delete project</button>
      </div>

      <Modal open={showDeleteModal} onClose={() => { if (!isDeleting) { setShowDeleteModal(false); } }}>
        {deleteStep === "warning" ? (
          <div className="grid gap-4">
            <div className="grid place-items-center gap-2 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-[0.875rem] border border-danger-border/60 bg-danger-bg text-lg text-danger-text">
                !
              </div>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">Delete project</p>
              <p className="text-xl font-semibold text-brand-text">{deleteTarget}</p>
              <p className="mt-1 text-xs text-brand-textMuted">Review the effects before continuing.</p>
            </div>

            <div className="rounded-[0.625rem] border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              Unexpected bad things will happen if you don&apos;t read this.
            </div>

            <div className="grid gap-2 border-l border-brand-border pl-3 text-xs text-brand-textMuted">
              <p>
                This will permanently delete <span className="font-semibold text-brand-text">{deleteTarget}</span>, including runs, metrics, and artifacts.
              </p>
              <p>Collaborator access and project settings will be removed.</p>
              <p className="font-semibold text-danger-text">This action cannot be undone.</p>
            </div>

            <button
              className={paperButtonClass + " w-full"}
              type="button"
              onClick={() => { setDeleteStep("confirm"); setDeleteError(null); }}
            >
              I have read and understand these effects
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid place-items-center gap-2 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-[0.875rem] border border-danger-border/60 bg-danger-bg text-lg text-danger-text">
                !
              </div>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-brand-textMuted">Confirm deletion</p>
              <p className="text-xl font-semibold text-brand-text">{deleteTarget}</p>
              <p className="mt-1 text-xs text-brand-textMuted">
                To confirm, type <span className="font-mono text-brand-text">{deleteTarget}</span> in the box below.
              </p>
            </div>

            {deleteError ? (
              <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-2.5 py-2 text-xs text-danger-text">{deleteError}</div>
            ) : null}

            <input
              className={lineInputClass + " bg-white"}
              type="text"
              value={deleteInput}
              placeholder={deleteTarget}
              onChange={(e) => { setDeleteInput(e.target.value); }}
            />

            <div className="grid gap-2">
              <button
                className={dangerButtonClass + " w-full py-2.5 text-sm"}
                type="button"
                style={{ cursor: isDeleting || !deleteConfirmed ? "not-allowed" : "pointer" }}
                disabled={isDeleting || !deleteConfirmed}
                onClick={() => { void handleDelete(); }}
              >
                {isDeleting ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
