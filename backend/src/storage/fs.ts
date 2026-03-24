import fs from "node:fs/promises";
import path from "node:path";

import chokidar from "chokidar";

import type { AppendResult, FileEntry, ReadResult, StorageBackend } from "storage/index";

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

  async read(storageKey: string, byteOffset = 0, byteCount?: number): Promise<Buffer> {
    const storagePath = this.resolveStoragePath(storageKey);
    if (byteOffset < 0) { throw new Error("byteOffset must be >= 0"); }
    if (byteCount !== undefined && byteCount < 0) { throw new Error("byteCount must be >= 0"); }
    const fileHandle = await fs.open(storagePath, "r");
    try {
      const fileSize = (await fileHandle.stat()).size;
      const availableBytes = Math.max(0, fileSize - byteOffset);
      const readLength = Math.min(byteCount ?? availableBytes, availableBytes);
      const buffer = Buffer.alloc(readLength);
      const { bytesRead } = await fileHandle.read(buffer, 0, readLength, byteOffset);
      return bytesRead === readLength ? buffer : buffer.subarray(0, bytesRead);
    } finally {
      await fileHandle.close();
    }
  }

  async safeRead(storageKey: string, byteOffset?: number, byteCount?: number): Promise<ReadResult> {
    try {
      return { ok: true, data: await this.read(storageKey, byteOffset, byteCount) };
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

  async listFiles(prefix: string): Promise<FileEntry[]> {
    const results: FileEntry[] = [];
    const queue: string[] = [prefix];
    while (queue.length > 0) {
      const currentPrefix = queue.shift() ?? "";
      const entries = await this.list(currentPrefix);
      for (const entry of entries) {
        const storageKey = currentPrefix ? `${currentPrefix}/${entry.name}` : entry.name;
        if (entry.isDirectory) {
          queue.push(storageKey);
        } else {
          results.push({ ...entry, name: storageKey });
        }
      }
    }
    return results;
  }

  onEvent(callback: (storageKey: string | null) => void): () => Promise<void> {
    const watcher = chokidar.watch(this.baseDir, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 } });
    const mapPath = (rawPath: string): string | null => {
      const relative = path.relative(this.baseDir, rawPath).replaceAll(path.sep, "/");
      return relative && !relative.startsWith("../") ? relative : null;
    };
    for (const event of ["add", "change", "unlink", "addDir", "unlinkDir"]) {
      watcher.on(event, (rawPath) => {
        callback(mapPath(rawPath as string));
      });
    }
    watcher.on("error", (error) => {
      console.error("storage watcher error", error);
      callback(null);
    });

    // eslint-disable-next-line @typescript-eslint/promise-function-async
    return () => watcher.close();
  }
}
