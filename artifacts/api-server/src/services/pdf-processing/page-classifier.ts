export type PageType = "digital" | "scanned" | "hybrid" | "blank";

export interface ClassificationInput {
  characterCount: number;
  wordCount: number;
  hasImages: boolean;
  imageCount: number;
  width: number;
  height: number;
  rawText: string;
}

export interface ClassificationResult {
  pageType: PageType;
  ocrRequired: boolean;
  reason: string;
}

export class PageClassifier {
  /**
   * Classify page according to BM-PRD-04 criteria
   */
  classify(input: ClassificationInput): ClassificationResult {
    const { characterCount, hasImages, imageCount, rawText } = input;
    const trimmed = rawText.trim();

    // 1. Blank page: no text or almost zero non-whitespace, and no images
    if (trimmed.length === 0 && !hasImages) {
      return {
        pageType: "blank",
        ocrRequired: false,
        reason: "Page contains no text and no images.",
      };
    }

    // 2. Pure scanned page: No or minimal native text (< 30 chars), but has images
    if (trimmed.length < 30 && hasImages) {
      return {
        pageType: "scanned",
        ocrRequired: true,
        reason: `Page has minimal native text (${trimmed.length} chars) and embedded images (${imageCount}). OCR required.`,
      };
    }

    // 3. Digital with substantial text
    if (characterCount >= 80) {
      if (hasImages) {
        return {
          pageType: "hybrid",
          ocrRequired: false,
          reason: `Page has rich native text (${characterCount} chars) and ${imageCount} images. Digital text used without OCR.`,
        };
      }
      return {
        pageType: "digital",
        ocrRequired: false,
        reason: `Page has native digital text (${characterCount} chars) and no images.`,
      };
    }

    // 4. Intermediate character count (30 - 79 chars)
    if (hasImages) {
      return {
        pageType: "hybrid",
        ocrRequired: false,
        reason: `Page contains moderate native text (${characterCount} chars) alongside images.`,
      };
    }

    // 5. Short digital text (e.g. chapter title, page number, short dedication) without images
    return {
      pageType: "digital",
      ocrRequired: false,
      reason: `Page has native text (${characterCount} chars) without images.`,
    };
  }
}
