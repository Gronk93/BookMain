import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type {
  StorageProvider,
  PutFileInput,
  StoredFile,
  FileMetadata,
  ByteRange,
} from "./storage-provider";

export class LocalPrivateStorage implements StorageProvider {
  private readonly rootDir: string;

  constructor(customRoot?: string) {
    const configured = customRoot || process.env.BOOKMIND_STORAGE_ROOT || "./data/storage";
    this.rootDir = path.resolve(process.cwd(), configured);
  }

  getStorageRoot(): string {
    return this.rootDir;
  }

  normalizeLogicalPath(logicalPath: string): string {
    const cleaned = logicalPath.replace(/\\/g, "/").replace(/^\/+/, "");
    // Ensure no path traversal components
    const parts = cleaned.split("/").filter((p) => p !== "" && p !== "." && p !== "..");
    return parts.join("/");
  }

  getPhysicalPath(logicalPath: string): string {
    const normalized = this.normalizeLogicalPath(logicalPath);
    const resolved = path.resolve(this.rootDir, ...normalized.split("/"));

    // Guard against directory traversal
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error(`Invalid path traversal detected for path: ${logicalPath}`);
    }

    return resolved;
  }

  async put(input: PutFileInput): Promise<StoredFile> {
    const physicalPath = this.getPhysicalPath(input.logicalPath);
    const parentDir = path.dirname(physicalPath);

    await fsp.mkdir(parentDir, { recursive: true });

    if (typeof input.content === "string") {
      // Content is a source filepath to copy/move
      const sourcePath = path.resolve(input.content);
      await fsp.copyFile(sourcePath, physicalPath);
    } else if (Buffer.isBuffer(input.content)) {
      await fsp.writeFile(physicalPath, input.content);
    } else if (input.content instanceof Readable) {
      const writeStream = fs.createWriteStream(physicalPath);
      await pipeline(input.content, writeStream);
    } else {
      throw new Error("Unsupported content type for StorageProvider.put");
    }

    const stat = await fsp.stat(physicalPath);

    return {
      logicalPath: this.normalizeLogicalPath(input.logicalPath),
      physicalPath,
      sizeBytes: stat.size,
      mimeType: input.mimeType || "application/pdf",
    };
  }

  async get(logicalPath: string, range?: ByteRange): Promise<Readable> {
    const physicalPath = this.getPhysicalPath(logicalPath);
    const exists = await this.exists(logicalPath);
    if (!exists) {
      throw new Error(`File not found: ${logicalPath}`);
    }

    if (range) {
      return fs.createReadStream(physicalPath, {
        start: range.start,
        end: range.end,
      });
    }

    return fs.createReadStream(physicalPath);
  }

  async exists(logicalPath: string): Promise<boolean> {
    try {
      const physicalPath = this.getPhysicalPath(logicalPath);
      await fsp.access(physicalPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async delete(logicalPath: string): Promise<void> {
    try {
      const physicalPath = this.getPhysicalPath(logicalPath);
      await fsp.unlink(physicalPath);
      // Clean up empty parent directory if possible
      const parentDir = path.dirname(physicalPath);
      try {
        const remaining = await fsp.readdir(parentDir);
        if (remaining.length === 0) {
          await fsp.rmdir(parentDir);
        }
      } catch {}
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
    }
  }

  async getMetadata(logicalPath: string): Promise<FileMetadata> {
    const physicalPath = this.getPhysicalPath(logicalPath);
    const stat = await fsp.stat(physicalPath);

    return {
      logicalPath: this.normalizeLogicalPath(logicalPath),
      sizeBytes: stat.size,
      mimeType: "application/pdf",
      lastModified: stat.mtime,
    };
  }
}

let storageInstance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (!storageInstance) {
    storageInstance = new LocalPrivateStorage();
  }
  return storageInstance;
}
