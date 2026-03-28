import { create } from "zustand";

import { request } from "helpers";
import { API_BASE } from "types";
import type { Media } from "types";

type MediaFetchResponse = { ok: true; body: Media[]; status: number } | { ok: false; error: string; status: number };

export const fetchRunMedia = async (handle: string, projectName: string, runName: string): Promise<MediaFetchResponse> =>
  await request<Media[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/media`);

export const getMediaFileUrl = (handle: string, projectName: string, runName: string, id: string, index = 0): string =>
  `${API_BASE}/accounts/${handle}/projects/${projectName}/runs/${runName}/media/${id}/file?index=${String(index)}`;

export const fetchMultiRunMedia = async (handle: string, projectName: string, runNames: string[]): Promise<Record<string, Media[]>> => {
  const responses = await Promise.all(runNames.map(async (runName) => ({ runName, response: await fetchRunMedia(handle, projectName, runName) })));
  const mediaByRun: Record<string, Media[]> = {};
  for (const { runName, response } of responses) { mediaByRun[runName] = response.ok ? response.body : []; }
  return mediaByRun;
};

interface MediaState {
  media: Media[];
  isLoading: boolean;
  error: string | null;
  fetchMedia: (handle: string, projectName: string, runName: string) => Promise<void>;
}

export const useMediaStore = create<MediaState>((set) => ({
  media: [],
  isLoading: false,
  error: null,

  fetchMedia: async (handle: string, projectName: string, runName: string) => {
    set({ isLoading: true, error: null });
    const response = await fetchRunMedia(handle, projectName, runName);
    if (response.ok) {
      set({ media: response.body, isLoading: false, error: null });
    } else {
      set({ error: response.error, isLoading: false });
    }
  }
}));
