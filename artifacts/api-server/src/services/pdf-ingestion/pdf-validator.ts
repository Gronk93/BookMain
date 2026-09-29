import fs from "node:fs";
import { promises as fsp } from "node:fs";
import {
  PdfEmptyError,
  PdfTooLargeError,
  PdfInvalidTypeError,
  PdfInvalidSignatureError,
} from "./errors";

export interface ValidationOptions {
  maxSizeMb?: number;
  expectedMimeType?: string;
  originalFilename?: string;
}

export function getMaxPdfSizeMb(): number {
  const envVal = process.env.MAX_PDF_SIZE_MB;
  if (envVal) {
    const parsed = Number(envVal);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 100; // default 100 MB
}

export async function validatePdfFile(
  filePath: string,
  options: ValidationOptions = {},
): Promise<{ sizeBytes: number; mimeType: string }> {
  const stat = await fsp.stat(filePath);
  const sizeBytes = stat.size;

  // 1. Check empty
  if (sizeBytes === 0) {
    throw new PdfEmptyError();
  }

  // 2. Check maximum size limit
  const maxMb = options.maxSizeMb ?? getMaxPdfSizeMb();
  const maxBytes = maxMb * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    throw new PdfTooLargeError(maxMb, sizeBytes);
  }

  // 3. Check filename extension / MIME
  if (options.originalFilename) {
    const lower = options.originalFilename.toLowerCase();
    if (!lower.endsWith(".pdf")) {
      throw new PdfInvalidTypeError();
    }
  }

  if (options.expectedMimeType && options.expectedMimeType !== "application/pdf") {
    // If client sent non-pdf MIME, check if it's octet-stream with .pdf extension, otherwise reject
    if (
      options.expectedMimeType !== "application/octet-stream" &&
      options.expectedMimeType !== "binary/octet-stream"
    ) {
      throw new PdfInvalidTypeError();
    }
  }

  // 4. Check binary signature (%PDF-)
  const buffer = Buffer.alloc(1024);
  const fd = await fsp.open(filePath, "r");
  try {
    const { bytesRead } = await fd.read(buffer, 0, 1024, 0);
    if (bytesRead < 5) {
      throw new PdfInvalidSignatureError();
    }

    const header = buffer.toString("utf-8", 0, Math.min(bytesRead, 1024));
    // Standard PDF files have %PDF- in the very beginning (sometimes preceded by UTF-8 BOM or whitespace)
    if (!header.trimStart().startsWith("%PDF-")) {
      throw new PdfInvalidSignatureError();
    }
  } finally {
    await fd.close();
  }

  return {
    sizeBytes,
    mimeType: "application/pdf",
  };
}
