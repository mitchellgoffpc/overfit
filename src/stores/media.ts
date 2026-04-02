import { create } from "zustand";

import { request } from "helpers";
import { buildRunKey } from "stores/runs";
import { API_BASE } from "types";
import type { Media } from "types";

interface MediaState {
  media: Record<string, Media[]>;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export const useMediaStore = create<MediaState>(() => ({
  media: {},
  isLoading: {},
  errors: {}
}));

export const getMediaFileUrl = (handle: string, projectName: string, runName: string, id: string, index = 0): string =>
  `${API_BASE}/accounts/${handle}/projects/${projectName}/runs/${runName}/media/${id}/file?index=${String(index)}`;

export const fetchMedia = async (handle: string, projectName: string, runName: string): Promise<void> => {
  const runKey = buildRunKey(handle, projectName, runName);
  useMediaStore.setState(({ isLoading, errors }) => ({
    isLoading: { ...isLoading, [runKey]: true },
    errors: { ...errors, [runKey]: null }
  }));
  const response = await request<Media[]>(`accounts/${handle}/projects/${projectName}/runs/${runName}/media`);
  useMediaStore.setState(({ media, isLoading, errors }) => ({
    media: response.ok ? { ...media, [runKey]: response.body } : media,
    isLoading: { ...isLoading, [runKey]: false },
    errors: { ...errors, [runKey]: response.ok ? null : response.error }
  }));
};
