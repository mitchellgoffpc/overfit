import { create } from "zustand";

import { request } from "helpers";

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
}

type FilesFetchResponse = { ok: true; body: FileEntry[]; status: number } | { ok: false; error: string; status: number };

export const fetchRunFiles = async (handle: string, projectName: string, runName: string, path?: string): Promise<FilesFetchResponse> => {
  const query = path ? `?path=${encodeURIComponent(path)}` : "";
  return await request<FileEntry[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/files${query}`);
};

interface FilesState {
  entries: FileEntry[];
  isLoading: boolean;
  error: string | null;
  fetchFiles: (handle: string, projectName: string, runName: string, path?: string) => Promise<void>;
}

export const useFilesStore = create<FilesState>((set) => ({
  entries: [],
  isLoading: false,
  error: null,

  fetchFiles: async (handle: string, projectName: string, runName: string, path?: string) => {
    set({ isLoading: true, error: null });
    const response = await fetchRunFiles(handle, projectName, runName, path);
    if (response.ok) {
      set({ entries: response.body, isLoading: false });
    } else {
      set({ error: response.error, isLoading: false });
    }
  }
}));
