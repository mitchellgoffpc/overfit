import path from "node:path";

import type { ID } from "@underfit/types";
import { z } from "zod";

import { FileStorageBackend } from "storage/fs";

export const StorageConfigSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("file"),
    baseDir: z.string().trim().min(1).default("storage"),
  })
]).prefault({ type: "file" });
export type StorageConfig = z.infer<typeof StorageConfigSchema>;

export interface AppendResult {
  storageKey: string;
  byteOffset: number;
  byteCount: number;
}

export type ReadResult = { ok: true; data: Buffer } | { ok: false; error: string };

export interface FileEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
}

export interface StorageBackend {
  write: (storageKey: string, content: Buffer) => Promise<string>;
  read: (storageKey: string, byteOffset?: number, byteCount?: number) => Promise<Buffer>;
  safeRead: (storageKey: string, byteOffset?: number, byteCount?: number) => Promise<ReadResult>;
  append: (storageKey: string, content: Buffer) => Promise<AppendResult>;
  list: (prefix: string) => Promise<FileEntry[]>;
  listFiles: (prefix: string) => Promise<FileEntry[]>;
  onEvent?: (callback: (storageKey: string | null) => void) => (() => Promise<void>);
}

export const getArtifactStoragePrefix = (projectId: ID, artifactId: ID, runId: ID | null): string =>
  runId ? path.join(runId, "artifacts", artifactId) : path.join(projectId, "artifacts", artifactId);
export const getArtifactManifestStorageKey = (storageKey: string): string => path.join(storageKey, "manifest.json");
export const getArtifactFileStorageKey = (storageKey: string, filePath: string): string => path.join(storageKey, "files", filePath);
export const getArtifactUploadMarkerStorageKey = (storageKey: string, filePath: string): string => path.join(storageKey, ".uploaded", filePath);
export const getMediaStorageKey = (runId: ID, mediaId: ID, index: number): string => path.join(runId, "media", mediaId, String(index));
export const getLogStorageKey = (runId: ID, workerId: string): string => path.join(runId, "logs", `${workerId}.log`);
export const getScalarStorageKey = (runId: ID, resolution: number): string => path.join(runId, "scalars", `r${String(resolution)}.jsonl`);

export const createStorage = (config: StorageConfig): StorageBackend => {
  return new FileStorageBackend(config.baseDir);
};
