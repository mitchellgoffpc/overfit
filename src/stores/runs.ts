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

const fetchInto = async <T>(url: string, key: string, toRuns: (body: T) => Run[]): Promise<T | null> => {
  useRunStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [key]: true },
    errors: { ...errors, [key]: null }
  }));
  const { ok, body, error } = await request<T>(url);
  useRunStore.setState(({ runs, isLoading, errors }) => ({
    runs: ok ? { ...runs, ...indexByKey(toRuns(body)) } : runs,
    isLoading: { ...isLoading, [key]: false },
    errors: { ...errors, [key]: ok ? null : error }
  }));
  return ok ? body : null;
};

export const fetchRuns = async (handle: string, projectName?: string): Promise<void> => {
  const key = projectName ? `${handle}/${projectName}` : handle;
  const url = projectName ? `accounts/${handle}/projects/${projectName}/runs` : `users/${handle}/runs`;
  await fetchInto<Run[]>(url, key, (runs) => runs);
};

export const fetchRun = async (handle: string, projectName: string, runName: string): Promise<Run | null> =>
  await fetchInto<Run>(`accounts/${handle}/projects/${projectName}/runs/${runName}`, buildRunKey(handle, projectName, runName), (run) => [run]);

const updateRunUIState = async (handle: string, projectName: string, runName: string, data: RunUIState): Promise<ActionResult<Run>> => {
  const result = await send<Run>(`accounts/${handle}/projects/${projectName}/runs/${runName}/ui-state`, "PUT", data);
  if (!result.ok) { return { ok: false, error: result.error }; }
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
};

export const pinRun = async (handle: string, projectName: string, runName: string, isPinned: boolean): Promise<ActionResult<Run>> =>
  await updateRunUIState(handle, projectName, runName, { isPinned });

export const setBaselineRun = async (handle: string, projectName: string, runName: string): Promise<ActionResult<Run>> =>
  await updateRunUIState(handle, projectName, runName, { isBaseline: true });

export const deleteRun = async (handle: string, projectName: string, runName: string): Promise<ActionResult> => {
  const result = await request<{ status: "ok" }>(`accounts/${handle}/projects/${projectName}/runs/${runName}`, { method: "DELETE" });
  if (!result.ok) { return { ok: false, error: result.error }; }
  const key = buildRunKey(handle, projectName, runName);
  useRunStore.setState(({ runs }) => ({
    runs: Object.fromEntries(Object.entries(runs).filter(([runKey]) => runKey !== key))
  }));
  return { ok: true };
};
