import type { ContextSourceItem } from "./context-builder";

export interface ValidatedCitation {
  id: string;
  pageNumber: number;
  quote: string;
  startBlockId?: string | null;
  startOffset?: number | null;
  endBlockId?: string | null;
  endOffset?: number | null;
  retrievalScore?: number | null;
  rank: number;
}

export function validateAndFormatCitations(
  candidateSourceIds: string[],
  availableSources: ContextSourceItem[],
  maxCitations: number = 5,
): ValidatedCitation[] {
  const sourceMap = new Map<string, ContextSourceItem>();
  for (const src of availableSources) {
    sourceMap.set(src.id, src);
  }

  const citations: ValidatedCitation[] = [];
  let rank = 1;

  for (const id of candidateSourceIds) {
    if (citations.length >= maxCitations) break;
    const src = sourceMap.get(id);
    if (!src) continue; // Reject hallucinated source IDs not in retrieved context!

    // Derive a clean, grounded quote snippet (first ~120 characters)
    const quote = src.text.length > 150 ? src.text.slice(0, 147) + "..." : src.text;

    citations.push({
      id: src.id,
      pageNumber: src.pageNumber,
      quote,
      startBlockId: src.startBlockId ?? null,
      startOffset: src.startOffset ?? 0,
      endBlockId: src.endBlockId ?? null,
      endOffset: src.endOffset ?? quote.length,
      retrievalScore: null,
      rank: rank++,
    });
  }

  // If candidateSourceIds was empty but availableSources exist and answer is grounded, pick the top source
  if (citations.length === 0 && availableSources.length > 0) {
    const top = availableSources[0];
    const quote = top.text.length > 150 ? top.text.slice(0, 147) + "..." : top.text;
    citations.push({
      id: top.id,
      pageNumber: top.pageNumber,
      quote,
      startBlockId: top.startBlockId ?? null,
      startOffset: top.startOffset ?? 0,
      endBlockId: top.endBlockId ?? null,
      endOffset: top.endOffset ?? quote.length,
      retrievalScore: null,
      rank: 1,
    });
  }

  return citations;
}
