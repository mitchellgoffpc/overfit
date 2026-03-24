import fs from "node:fs/promises";
import path from "node:path";

import type { AppendResult, FileEntry, ReadResult, StorageBackend } from "storage";

export class FileStorageBackend implements StorageBackend {
  private readonly baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  private resolveStoragePath(storageKey: string): string {
    if (path.isAbsolute(storageKey)) {
      throw new Error("storageKey must be relative to storage.baseDir");
    }
    const resolvedPath = path.resolve(this.baseDir, storageKey);
    if (resolvedPath === this.baseDir || resolvedPath.startsWith(`${this.baseDir}${path.sep}`)) {
      return resolvedPath;
    }
    throw new Error("storageKey must stay within storage.baseDir");
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

  async safeRead(storageKey: string): Promise<ReadResult> {
    try {
      return { ok: true, data: await fs.readFile(this.resolveStoragePath(storageKey)) };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return { ok: false, error: "File not found" };
      }
      throw error;
    }
  }

  async append(storageKey: string, content: Buffer): Promise<AppendResult> {
    const storagePath = this.resolveStoragePath(storageKey);
    await fs.mkdir(path.dirname(storagePath), { recursive: true });
    let byteOffset = 0;
    try {
      byteOffset = (await fs.stat(storagePath)).size;
    } catch { /* file does not exist yet */ }
    await fs.appendFile(storagePath, content);
    return { storageKey: path.relative(this.baseDir, storagePath), byteOffset, byteCount: content.length };
  }

  async readRange(storageKey: string, byteOffset: number, byteCount: number): Promise<Buffer> {
    const storagePath = this.resolveStoragePath(storageKey);
    const fileHandle = await fs.open(storagePath, "r");
    try {
      const buffer = Buffer.alloc(byteCount);
      await fileHandle.read(buffer, 0, byteCount, byteOffset);
      return buffer;
    } finally {
      await fileHandle.close();
    }
  }

  async list(prefix: string): Promise<FileEntry[]> {
    const dir = this.resolveStoragePath(prefix);
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") { return []; }
      throw error;
    }
    const results: FileEntry[] = [];
    for (const entry of entries) {
      const isDirectory = entry.isDirectory();
      const stat = await fs.stat(path.join(dir, entry.name));
      const size = isDirectory ? 0 : stat.size;
      results.push({ name: entry.name, isDirectory, size, lastModified: stat.mtime.toISOString() });
    }
    results.sort((a, b) => a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1);
    return results;
  }

  async safeReadRange(storageKey: string, byteOffset: number, byteCount: number): Promise<ReadResult> {
    const storagePath = this.resolveStoragePath(storageKey);
    let fileHandle;
    try {
      fileHandle = await fs.open(storagePath, "r");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return { ok: false, error: "File not found" };
      }
      throw error;
    }
    try {
      const buffer = Buffer.alloc(byteCount);
      await fileHandle.read(buffer, 0, byteCount, byteOffset);
      return { ok: true, data: buffer };
    } finally {
      await fileHandle.close();
    }
  }
}
