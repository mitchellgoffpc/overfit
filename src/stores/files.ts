import { create } from "zustand";

import type { APIResponse } from "helpers";
import { request } from "helpers";
import { buildRunKey } from "stores/runs";

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
}

interface FilesState {
  entries: Record<string, FileEntry[]>;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export const useFilesStore = create<FilesState>(() => ({
  entries: {},
  isLoading: {},
  errors: {}
}));

export const fetchRunFiles = async (handle: string, projectName: string, runName: string, path?: string): Promise<APIResponse<FileEntry[]>> => {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return await request<FileEntry[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/files${query}`);
};

export const fetchFiles = async (handle: string, projectName: string, runName: string, path?: string): Promise<void> => {
  const scopeKey = `${buildRunKey(handle, projectName, runName)}/${path ?? ""}`;
  useFilesStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [scopeKey]: true },
    errors: { ...errors, [scopeKey]: null }
  }));
  const response = await fetchRunFiles(handle, projectName, runName, path);
  useFilesStore.setState(({ entries, isLoading, errors }) => ({
    entries: response.ok ? { ...entries, [scopeKey]: response.body } : entries,
    isLoading: { ...isLoading, [scopeKey]: false },
    errors: { ...errors, [scopeKey]: response.ok ? null : response.error }
  }));
};
