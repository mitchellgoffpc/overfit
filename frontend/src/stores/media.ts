import type { Media } from "@underfit/types";
import { create } from "zustand";

import { apiBase, request } from "helpers";

type MediaFetchResponse = { ok: true; body: Media[]; status: number } | { ok: false; error: string; status: number };

export const fetchRunMedia = async (handle: string, projectName: string, runName: string): Promise<MediaFetchResponse> =>
  await request<Media[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/media`);

export const getMediaFileUrl = (handle: string, projectName: string, runName: string, id: string): string =>
  `${apiBase}/accounts/${handle}/projects/${projectName}/runs/${runName}/media/${id}/file`;

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
