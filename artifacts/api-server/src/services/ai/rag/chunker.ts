import crypto from "node:crypto";

export interface PageBlockInput {
  id?: string;
  text: string;
  [key: string]: any;
}

export interface PageInput {
  bookId: string;
  pageNumber: number;
  textContent?: string | null;
  normalizedText?: string | null;
  rawText?: string | null;
  textBlocks?: PageBlockInput[] | null;
  qualityScore?: number | null;
  textSource?: string | null;
}

export interface ChunkOutput {
  bookId: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  textHash: string;
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
  tokenCount: number;
  qualityScore: number;
  textSource: string;
}

export function computeTextHash(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function chunkPage(page: PageInput): ChunkOutput[] {
  const quality = page.qualityScore ?? 100;
  const source = page.textSource || "extracted";
  const chunks: ChunkOutput[] = [];

  // Case 1: Page has structured textBlocks
  if (Array.isArray(page.textBlocks) && page.textBlocks.length > 0) {
    const blocks = page.textBlocks
      .map((b, idx) => ({
        id: b.id || `b-${idx}`,
        text: (b.text || "").trim(),
      }))
      .filter((b) => b.text.length > 0);

    if (blocks.length === 0) return [];

    let currentChunkBlocks: typeof blocks = [];
    let currentLength = 0;
    let chunkIdx = 0;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      currentChunkBlocks.push(block);
      currentLength += block.text.length + 1;

      // Break chunk at ~500 chars or if last block
      if (currentLength >= 500 || i === blocks.length - 1) {
        const first = currentChunkBlocks[0];
        const last = currentChunkBlocks[currentChunkBlocks.length - 1];
        const combinedText = currentChunkBlocks.map((b) => b.text).join("\n\n");

        if (combinedText.trim().length > 0) {
          const words = combinedText.trim().split(/\s+/).length;
          chunks.push({
            bookId: page.bookId,
            pageNumber: page.pageNumber,
            chunkIndex: chunkIdx++,
            text: combinedText.trim(),
            textHash: computeTextHash(combinedText),
            startBlockId: first.id,
            startOffset: 0,
            endBlockId: last.id,
            endOffset: last.text.length,
            tokenCount: Math.ceil(words * 1.3),
            qualityScore: Math.round(quality),
            textSource: source,
          });
        }

        currentChunkBlocks = [];
        currentLength = 0;
      }
    }

    return chunks;
  }

  // Case 2: Plain text (textContent, normalizedText, or rawText)
  const fullText = (page.normalizedText || page.textContent || page.rawText || "").trim();
  if (!fullText) return [];

  // Split by double newlines or paragraph segments
  const paragraphs = fullText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    paragraphs.push(fullText);
  }

  let currentParaGroup: string[] = [];
  let currentGroupLength = 0;
  let chunkIdx = 0;
  let currentOffset = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    currentParaGroup.push(para);
    currentGroupLength += para.length + 2;

    if (currentGroupLength >= 500 || i === paragraphs.length - 1) {
      const text = currentParaGroup.join("\n\n");
      const words = text.trim().split(/\s+/).length;
      const startBlockId = `b-${chunkIdx}`;
      const endBlockId = `b-${chunkIdx}`;

      chunks.push({
        bookId: page.bookId,
        pageNumber: page.pageNumber,
        chunkIndex: chunkIdx++,
        text: text.trim(),
        textHash: computeTextHash(text),
        startBlockId,
        startOffset: 0,
        endBlockId,
        endOffset: text.length,
        tokenCount: Math.ceil(words * 1.3),
        qualityScore: Math.round(quality),
        textSource: source,
      });

      currentOffset += text.length + 2;
      currentParaGroup = [];
      currentGroupLength = 0;
    }
  }

  return chunks;
}
