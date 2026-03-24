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
  read: (storageKey: string) => Promise<Buffer>;
  safeRead: (storageKey: string) => Promise<ReadResult>;
  append: (storageKey: string, content: Buffer) => Promise<AppendResult>;
  readRange: (storageKey: string, byteOffset: number, byteCount: number) => Promise<Buffer>;
  safeReadRange: (storageKey: string, byteOffset: number, byteCount: number) => Promise<ReadResult>;
  list: (prefix: string) => Promise<FileEntry[]>;
}

export const getArtifactStorageKey = (runId: ID, artifactId: ID): string => path.join(runId, artifactId);
export const getMediaStorageKey = (runId: ID, mediaId: ID, index: number): string => path.join(runId, "media", mediaId, String(index));
export const getLogStorageKey = (runId: ID, workerId: string): string => path.join(runId, "logs", `${workerId}.log`);
export const getScalarStorageKey = (runId: ID, resolution: number): string => path.join(runId, "scalars", `r${String(resolution)}.jsonl`);

export const createStorage = (config: StorageConfig): StorageBackend => {
  return new FileStorageBackend(config.baseDir);
};
