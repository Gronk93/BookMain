import { createCanvas } from "@napi-rs/canvas";

export interface RenderPageOptions {
  scale?: number;
}

export interface RenderedPageResult {
  imageBuffer: Buffer;
  width: number;
  height: number;
}

export function buildPagePreviewLogicalPath(
  userId: string,
  bookId: string,
  pageNumber: number,
  format: "png" | "webp" = "png",
): string {
  return `users/${userId}/books/${bookId}/derived/previews/${pageNumber}.${format}`;
}

export class PageRenderer {
  /**
   * Renders a single 1-based page of a loaded PDF.js document to an image buffer.
   */
  async renderPage(
    doc: any,
    pageNumber: number,
    options: RenderPageOptions = {},
  ): Promise<RenderedPageResult> {
    const scale = options.scale || 1.5;
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const width = Math.round(viewport.width);
    const height = Math.round(viewport.height);

    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");

    // Fill white background before rendering PDF content (for transparent PDFs)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    const imageBuffer = canvas.toBuffer("image/png");

    page.cleanup();

    return {
      imageBuffer,
      width,
      height,
    };
  }
}
