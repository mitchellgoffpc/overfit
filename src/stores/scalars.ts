import { create } from "zustand";

import { request } from "helpers";
import { buildRunKey } from "stores/runs";
import type { ScalarSeries } from "types";

interface ScalarState {
  scalars: Record<string, ScalarSeries>;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export const useScalarStore = create<ScalarState>(() => ({
  scalars: {},
  isLoading: {},
  errors: {}
}));

export const fetchScalars = async (handle: string, projectName: string, runName: string): Promise<void> => {
  const runKey = buildRunKey(handle, projectName, runName);
  useScalarStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [runKey]: true },
    errors: { ...errors, [runKey]: null }
  }));
  const response = await request<ScalarSeries>(`accounts/${handle}/projects/${projectName}/runs/${runName}/scalars`);
  useScalarStore.setState(({ scalars, isLoading, errors }) => ({
    scalars: response.ok ? { ...scalars, [runKey]: response.body } : scalars,
    isLoading: { ...isLoading, [runKey]: false },
    errors: { ...errors, [runKey]: response.ok ? null : response.error }
  }));
};
