import fs from "node:fs/promises";
import path from "node:path";

import type { ID } from "@underfit/types";

export type StorageType = "file";

export interface FileStorageConfig {
  baseDir: string;
}

export interface StorageConfig {
  type: StorageType;
  file?: FileStorageConfig;
}

export interface StorageBackend {
  write: (storageKey: string, content: Buffer) => Promise<string>;
  read: (storageKey: string) => Promise<Buffer>;
}

class FileStorageBackend implements StorageBackend {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  private resolveStoragePath(storageKey: string): string {
    if (path.isAbsolute(storageKey)) {
      throw new Error("storageKey must be relative to storage.file.baseDir");
    }
    const resolvedPath = path.resolve(this.baseDir, storageKey);
    if (resolvedPath === this.baseDir || resolvedPath.startsWith(`${this.baseDir}${path.sep}`)) {
      return resolvedPath;
    }
    throw new Error("storageKey must stay within storage.file.baseDir");
  }

  async write(storageKey: string, content: Buffer): Promise<string> {
    const storagePath = this.resolveStoragePath(storageKey);
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    await fs.writeFile(storagePath, content);
    return path.relative(this.baseDir, storagePath);
  }

  async read(storageKey: string): Promise<Buffer> {
    return await fs.readFile(this.resolveStoragePath(storageKey));
  }
}

export const getArtifactStorageKey = (runId: ID, artifactId: ID): string => path.join(runId, artifactId);
export const getLogSegmentStorageKey = (runId: ID, workerId: string, startLine: number): string => path.join(runId, "logs", workerId, `${String(startLine)}.log`);

export const createStorage = (config: StorageConfig): StorageBackend => {
  const baseDir = config.file?.baseDir ?? "artifacts";
  return new FileStorageBackend(baseDir);
};
