import type { Readable } from "node:stream";

export interface PutFileInput {
  logicalPath: string;
  content: Buffer | Readable | string; // Buffer, stream, or local filepath to copy/move
  mimeType?: string;
}

export interface StoredFile {
  logicalPath: string;
  physicalPath: string;
  sizeBytes: number;
  mimeType: string;
}

export interface FileMetadata {
  logicalPath: string;
  sizeBytes: number;
  mimeType: string;
  lastModified: Date;
}

export interface ByteRange {
  start: number;
  end?: number;
}

export interface StorageProvider {
  put(input: PutFileInput): Promise<StoredFile>;
  get(logicalPath: string, range?: ByteRange): Promise<Readable>;
  exists(logicalPath: string): Promise<boolean>;
  delete(logicalPath: string): Promise<void>;
  getMetadata(logicalPath: string): Promise<FileMetadata>;
  getPhysicalPath(logicalPath: string): string;
}
