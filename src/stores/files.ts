import { create } from "zustand";

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

export const fetchFiles = async (handle: string, projectName: string, runName: string, path?: string): Promise<void> => {
  const scopeKey = `${buildRunKey(handle, projectName, runName)}/${path ?? ""}`;
  useFilesStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [scopeKey]: true },
    errors: { ...errors, [scopeKey]: null }
  }));
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  const response = await request<FileEntry[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/files${query}`);
  useFilesStore.setState(({ entries, isLoading, errors }) => ({
    entries: response.ok ? { ...entries, [scopeKey]: response.body } : entries,
    isLoading: { ...isLoading, [scopeKey]: false },
    errors: { ...errors, [scopeKey]: response.ok ? null : response.error }
  }));
};
