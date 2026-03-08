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
  writeArtifact: (runId: ID, artifactId: ID, content: Buffer) => Promise<string>;
  readArtifact: (runId: ID, artifactId: ID) => Promise<Buffer>;
}

class FileStorageBackend implements StorageBackend {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  async writeArtifact(runId: ID, artifactId: ID, content: Buffer): Promise<string> {
    const artifactDir = path.join(this.baseDir, runId);
    const artifactPath = path.join(artifactDir, artifactId);
    await fs.mkdir(artifactDir, { recursive: true });
    await fs.writeFile(artifactPath, content);
    return artifactPath;
  }

  async readArtifact(runId: ID, artifactId: ID): Promise<Buffer> {
    const artifactPath = path.join(this.baseDir, runId, artifactId);
    return await fs.readFile(artifactPath);
  }
}

export const createStorage = (config: StorageConfig): StorageBackend => {
  const baseDir = config.file?.baseDir ?? "artifacts";
  return new FileStorageBackend(baseDir);
};
