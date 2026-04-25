import { create } from "zustand";

import type { ActionResult } from "helpers";
import { request, send } from "helpers";
import type { Run, RunUIState } from "types";

interface RunState {
  runs: Record<string, Run>;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export const useRunStore = create<RunState>(() => ({
  runs: {},
  isLoading: {},
  errors: {}
}));

export const getUserRuns = (handle: string) => (state: RunState): Run[] => (
  Object.values(state.runs).filter((r) => r.projectOwner === handle).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
);

export const getProjectRuns = (projectId: string) => (state: RunState): Run[] => (
  Object.values(state.runs).filter((r) => r.projectId === projectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
);

export const buildRunKey = (handle: string, projectName: string, runName: string): string => `${handle}/${projectName}/${runName}`;
const indexByKey = (runs: Run[]) => Object.fromEntries(runs.map((run) => [buildRunKey(run.projectOwner, run.projectName, run.name), run]));

export const fetchRuns = async (handle: string, projectName?: string): Promise<void> => {
  const key = projectName ? `${handle}/${projectName}` : handle;
  const url = projectName ? `accounts/${handle}/projects/${projectName}/runs` : `users/${handle}/runs`;
  useRunStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [key]: true },
    errors: { ...errors, [key]: null }
  }));
  const { ok, body, error } = await request<Run[]>(url);
  useRunStore.setState(({ runs, isLoading, errors }) => ({
    runs: ok ? { ...runs, ...indexByKey(body) } : runs,
    isLoading: { ...isLoading, [key]: false },
    errors: { ...errors, [key]: ok ? null : error }
  }));
};

export const fetchRun = async (handle: string, projectName: string, runName: string): Promise<Run | null> => {
  const runKey = buildRunKey(handle, projectName, runName);
  useRunStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [runKey]: true },
    errors: { ...errors, [runKey]: null }
  }));
  const { ok, body, error } = await request<Run>(`accounts/${handle}/projects/${projectName}/runs/${runName}`);
  useRunStore.setState(({ runs, isLoading, errors }) => ({
    runs: ok ? { ...runs, ...indexByKey([body]) } : runs,
    isLoading: { ...isLoading, [runKey]: false },
    errors: { ...errors, [runKey]: ok ? null : error }
  }));
  return ok ? body : null;
};

export const updateRunUIState = async (handle: string, projectName: string, runName: string, data: RunUIState): Promise<ActionResult<Run>> => {
  const result = await send<Run>(`accounts/${handle}/projects/${projectName}/runs/${runName}/ui-state`, "PUT", data);
  if (result.ok) {
    const updatedRun = result.body;
    useRunStore.setState(({ runs }) => ({
      runs: {
        ...Object.fromEntries(Object.entries(runs).map(([key, existing]) => [
          key,
          updatedRun.isBaseline && existing.projectId === updatedRun.projectId ? { ...existing, isBaseline: false } : existing
        ])),
        ...indexByKey([updatedRun])
      }
    }));
    return { ok: true, body: updatedRun };
  }
  return { ok: false, error: result.error };
};

export const pinRun = async (handle: string, projectName: string, runName: string, isPinned: boolean): Promise<ActionResult<Run>> =>
  await updateRunUIState(handle, projectName, runName, { isPinned });

export const setBaselineRun = async (handle: string, projectName: string, runName: string): Promise<ActionResult<Run>> =>
  await updateRunUIState(handle, projectName, runName, { isBaseline: true });

export const deleteRun = async (handle: string, projectName: string, runName: string): Promise<ActionResult> => {
  const result = await request<{ status: "ok" }>(`accounts/${handle}/projects/${projectName}/runs/${runName}`, { method: "DELETE" });
  if (result.ok) {
    const key = buildRunKey(handle, projectName, runName);
    useRunStore.setState(({ runs }) => ({
      runs: Object.fromEntries(Object.entries(runs).filter(([runKey]) => runKey !== key))
    }));
    return { ok: true };
  }
  return { ok: false, error: result.error };
};
