import { promises as fsp } from "node:fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export interface TextBlockItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface ExtractedPageText {
  pageNumber: number; // 1-based
  rawText: string;
  textBlocks: TextBlockItem[];
  characterCount: number;
  wordCount: number;
  width: number;
  height: number;
  rotation: number;
  hasImages: boolean;
  imageCount: number;
}

export interface ExtractPdfOptions {
  maxPages?: number;
}

export class PdfTextExtractor {
  /**
   * Load PDF document from physical path or buffer
   */
  async loadDocument(source: string | Buffer): Promise<any> {
    const data = typeof source === "string" ? new Uint8Array(await fsp.readFile(source)) : new Uint8Array(source);
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
    });
    return await loadingTask.promise;
  }

  /**
   * Extract data from a single 1-based page of a loaded document
   */
  async extractPage(doc: any, pageNumber: number): Promise<ExtractedPageText> {
    if (pageNumber < 1 || pageNumber > doc.numPages) {
      throw new Error(`Page number ${pageNumber} out of range [1, ${doc.numPages}]`);
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });
    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);
    const rotation = viewport.rotation || 0;

    // 1. Extract text content
    const textContent = await page.getTextContent();
    const textBlocks: TextBlockItem[] = [];
    const rawStrings: string[] = [];

    for (const item of textContent.items) {
      if ("str" in item && typeof item.str === "string") {
        const text = item.str;
        // In PDF.js transform: [scaleX, skewY, skewX, scaleY, tx, ty]
        const tx = item.transform ? Math.round(item.transform[4]) : 0;
        const ty = item.transform ? Math.round(item.transform[5]) : 0;
        const itemWidth = Math.round(item.width || 0);
        const itemHeight = Math.round(item.height || 0);

        if (text.length > 0) {
          textBlocks.push({
            text,
            x: tx,
            y: ty,
            width: itemWidth,
            height: itemHeight,
          });
          rawStrings.push(text);
          if ((item as any).hasEOL) {
            rawStrings.push("\n");
          } else {
            rawStrings.push(" ");
          }
        }
      }
    }

    const rawText = rawStrings.join("").trim();

    // 2. Detect images in operator list
    let imageCount = 0;
    try {
      const opList = await page.getOperatorList();
      for (let i = 0; i < opList.fnArray.length; i++) {
        const fn = opList.fnArray[i];
        if (
          fn === (pdfjsLib.OPS as any).paintImageXObject ||
          fn === (pdfjsLib.OPS as any).paintInlineImageXObject ||
          fn === (pdfjsLib.OPS as any).paintXObject
        ) {
          imageCount++;
        }
      }
    } catch {
      // If operator list retrieval fails, imageCount remains 0
    }

    const characterCount = rawText.length;
    const words = rawText.length > 0 ? rawText.trim().split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    // Clean up page resources
    page.cleanup();

    return {
      pageNumber,
      rawText,
      textBlocks,
      characterCount,
      wordCount,
      width,
      height,
      rotation,
      hasImages: imageCount > 0,
      imageCount,
    };
  }

  /**
   * Extract all pages from a PDF document
   */
  async extractAllPages(source: string | Buffer): Promise<{ totalPages: number; pages: ExtractedPageText[] }> {
    const doc = await this.loadDocument(source);
    const totalPages = doc.numPages;
    const pages: ExtractedPageText[] = [];

    for (let p = 1; p <= totalPages; p++) {
      const pageData = await this.extractPage(doc, p);
      pages.push(pageData);
    }

    if (typeof doc.cleanup === "function") {
      await doc.cleanup();
    }
    return { totalPages, pages };
  }
}
