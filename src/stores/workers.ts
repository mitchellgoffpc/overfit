import { create } from "zustand";

import { request } from "helpers";
import { buildRunKey } from "stores/runs";
import type { Worker } from "types";

interface WorkerState {
  workers: Record<string, Worker[]>;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export const useWorkerStore = create<WorkerState>(() => ({
  workers: {},
  isLoading: {},
  errors: {}
}));

export const fetchWorkers = async (handle: string, projectName: string, runName: string): Promise<void> => {
  const runKey = buildRunKey(handle, projectName, runName);
  useWorkerStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [runKey]: true },
    errors: { ...errors, [runKey]: null }
  }));
  const response = await request<Worker[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/workers`);
  useWorkerStore.setState(({ workers, isLoading, errors }) => ({
    workers: response.ok ? { ...workers, [runKey]: response.body } : workers,
    isLoading: { ...isLoading, [runKey]: false },
    errors: { ...errors, [runKey]: response.ok ? null : response.error }
  }));
};
