import { promises as fsp } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import {
  PdfCorruptedError,
  PdfPasswordProtectedError,
} from "./errors";

export interface PdfMetadata {
  pageCount: number;
  title: string;
  author?: string;
  isEncrypted: boolean;
}

export function generateFallbackTitle(filename: string): string {
  const base = path.basename(filename).replace(/\.[^/.]+$/, "");
  const withSpaces = base.replace(/[-_]+/g, " ").trim();
  if (!withSpaces) return "Documento PDF";

  // Capitalize words
  return withSpaces
    .split(" ")
    .filter((w) => w.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function inspectPdfFile(
  filePath: string,
  originalFilename: string,
): Promise<PdfMetadata> {
  let buffer: Buffer;
  try {
    buffer = await fsp.readFile(filePath);
  } catch {
    throw new PdfCorruptedError("Could not read uploaded PDF file.");
  }

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err: any) {
    const msg = String(err?.message || "");
    if (msg.includes("encrypted") || msg.includes("password")) {
      throw new PdfPasswordProtectedError();
    }
    throw new PdfCorruptedError(`Unable to parse PDF document structure: ${msg}`);
  }

  if (doc.isEncrypted) {
    throw new PdfPasswordProtectedError();
  }

  let pageCount = 0;
  try {
    pageCount = doc.getPageCount();
  } catch {
    throw new PdfCorruptedError("Failed to extract page count from PDF document.");
  }

  if (pageCount < 1) {
    throw new PdfCorruptedError("PDF document does not contain any readable pages.");
  }

  // Extract metadata if available
  const rawTitle = doc.getTitle()?.trim();
  const rawAuthor = doc.getAuthor()?.trim();

  const title = rawTitle && rawTitle.length > 0 ? rawTitle : generateFallbackTitle(originalFilename);
  const author = rawAuthor && rawAuthor.length > 0 ? rawAuthor : undefined;

  return {
    pageCount,
    title,
    author,
    isEncrypted: false,
  };
}
