import crypto from "node:crypto";

export interface PageBlockLike {
  id: string;
  text: string;
  bbox?: { x: number; y: number; width: number; height: number } | null;
  [key: string]: any;
}

export interface AnchorInput {
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
  exactText: string;
  prefixText?: string | null;
  suffixText?: string | null;
  textHash?: string | null;
}

export interface ResolveAnchorResult {
  status: "resolved" | "recovered" | "needs_review" | "orphaned";
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
  confidence: number;
}

/**
 * Normalizes text by trimming leading/trailing whitespace and collapsing multiple spaces.
 */
export function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Computes deterministic SHA-256 hash of normalized text.
 */
export function computeTextHash(text: string): string {
  const normalized = normalizeText(text);
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Extracts text between two block offsets in an ordered list of blocks.
 * If startBlockId === endBlockId, extracts from that single block.
 * If across multiple blocks, joins block segments with a newline or space.
 */
export function extractTextRange(
  blocks: PageBlockLike[],
  startBlockId: string,
  startOffset: number,
  endBlockId: string,
  endOffset: number
): string | null {
  const startIndex = blocks.findIndex((b) => b.id === startBlockId);
  const endIndex = blocks.findIndex((b) => b.id === endBlockId);

  if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) {
    return null;
  }

  if (startIndex === endIndex) {
    const text = blocks[startIndex].text || "";
    if (startOffset < 0 || endOffset > text.length || startOffset > endOffset) {
      return null;
    }
    return text.slice(startOffset, endOffset);
  }

  const parts: string[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const b = blocks[i];
    const bText = b.text || "";
    if (i === startIndex) {
      parts.push(bText.slice(startOffset));
    } else if (i === endIndex) {
      parts.push(bText.slice(0, endOffset));
    } else {
      parts.push(bText);
    }
  }

  return parts.join("\n");
}

/**
 * Creates prefix and suffix context for disambiguation.
 */
export function extractContext(
  blocks: PageBlockLike[],
  startBlockId: string,
  startOffset: number,
  endBlockId: string,
  endOffset: number,
  contextLength = 48
): { prefixText: string; suffixText: string } {
  const startIndex = blocks.findIndex((b) => b.id === startBlockId);
  const endIndex = blocks.findIndex((b) => b.id === endBlockId);

  let prefixText = "";
  if (startIndex !== -1) {
    let before = blocks[startIndex].text?.slice(0, startOffset) || "";
    let curr = startIndex - 1;
    while (before.length < contextLength && curr >= 0) {
      const prevText = blocks[curr].text || "";
      before = prevText + "\n" + before;
      curr--;
    }
    prefixText = before.slice(-contextLength);
  }

  let suffixText = "";
  if (endIndex !== -1) {
    let after = blocks[endIndex].text?.slice(endOffset) || "";
    let curr = endIndex + 1;
    while (after.length < contextLength && curr < blocks.length) {
      const nextText = blocks[curr].text || "";
      after = after + "\n" + nextText;
      curr++;
    }
    suffixText = after.slice(0, contextLength);
  }

  return { prefixText, suffixText };
}

/**
 * Resolves an anchor against a page's current text blocks.
 * Resolution Order:
 * 1. Test existing block IDs and offsets. If exact match or normalized match -> "resolved".
 * 2. Search all blocks for exact match of exactText.
 *    If single match -> "recovered".
 * 3. If multiple matches, use prefix/suffix context to disambiguate.
 *    If single best match with high score -> "recovered".
 * 4. If ambiguity remains or text cannot be verified -> "needs_review".
 * 5. If blocks are empty or completely missing -> "orphaned".
 */
export function resolveAnchor(
  blocks: PageBlockLike[],
  anchor: AnchorInput
): ResolveAnchorResult {
  const {
    startBlockId,
    startOffset,
    endBlockId,
    endOffset,
    exactText,
    prefixText,
    suffixText,
  } = anchor;

  if (!blocks || blocks.length === 0) {
    return {
      status: "orphaned",
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      confidence: 0,
    };
  }

  const normExact = normalizeText(exactText);

  // Step 1: Check if original location still matches
  const directText = extractTextRange(
    blocks,
    startBlockId,
    startOffset,
    endBlockId,
    endOffset
  );

  if (directText !== null) {
    if (directText === exactText) {
      return {
        status: "resolved",
        startBlockId,
        startOffset,
        endBlockId,
        endOffset,
        confidence: 1.0,
      };
    }
    if (normalizeText(directText) === normExact) {
      return {
        status: "resolved",
        startBlockId,
        startOffset,
        endBlockId,
        endOffset,
        confidence: 0.95,
      };
    }
  }

  // Step 2 & 3: Search within individual blocks or across blocks
  interface MatchCandidate {
    startBlockId: string;
    startOffset: number;
    endBlockId: string;
    endOffset: number;
    contextScore: number;
  }

  const candidates: MatchCandidate[] = [];

  // 2a. Single-block occurrences
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const text = block.text || "";
    let searchPos = 0;
    while (searchPos < text.length) {
      const idx = text.indexOf(exactText, searchPos);
      if (idx === -1) break;

      const cPrefix = text.slice(Math.max(0, idx - 48), idx);
      const cSuffix = text.slice(
        idx + exactText.length,
        idx + exactText.length + 48
      );

      let score = 0;
      if (prefixText && cPrefix.includes(prefixText.slice(-16))) score += 1;
      if (suffixText && cSuffix.includes(suffixText.slice(0, 16))) score += 1;
      if (block.id === startBlockId) score += 0.5;

      candidates.push({
        startBlockId: block.id,
        startOffset: idx,
        endBlockId: block.id,
        endOffset: idx + exactText.length,
        contextScore: score,
      });

      searchPos = idx + 1;
    }
  }

  // 2b. If exact match inside single blocks yielded 1 match:
  if (candidates.length === 1) {
    return {
      status: "recovered",
      startBlockId: candidates[0].startBlockId,
      startOffset: candidates[0].startOffset,
      endBlockId: candidates[0].endBlockId,
      endOffset: candidates[0].endOffset,
      confidence: 0.9,
    };
  }

  // 2c. If multiple candidates, disambiguate using contextScore
  if (candidates.length > 1) {
    candidates.sort((a, b) => b.contextScore - a.contextScore);
    if (candidates[0].contextScore > candidates[1].contextScore) {
      return {
        status: "recovered",
        startBlockId: candidates[0].startBlockId,
        startOffset: candidates[0].startOffset,
        endBlockId: candidates[0].endBlockId,
        endOffset: candidates[0].endOffset,
        confidence: 0.85,
      };
    }
    // Ambiguous: multiple matches with equal context score
    return {
      status: "needs_review",
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      confidence: 0.4,
    };
  }

  // 2d. Multi-block search fallback: concatenated page text
  let fullPageText = "";
  const blockOffsets: Array<{ blockId: string; start: number; end: number }> = [];
  for (const b of blocks) {
    const start = fullPageText.length;
    fullPageText += (b.text || "") + "\n";
    blockOffsets.push({ blockId: b.id, start, end: fullPageText.length - 1 });
  }

  const multiIdx = fullPageText.indexOf(exactText);
  if (multiIdx !== -1) {
    const endIdx = multiIdx + exactText.length;
    const startBlock = blockOffsets.find(
      (bo) => multiIdx >= bo.start && multiIdx <= bo.end
    );
    const endBlock = blockOffsets.find(
      (bo) => endIdx >= bo.start && endIdx <= bo.end + 1
    );

    if (startBlock && endBlock) {
      return {
        status: "recovered",
        startBlockId: startBlock.blockId,
        startOffset: multiIdx - startBlock.start,
        endBlockId: endBlock.blockId,
        endOffset: endIdx - endBlock.start,
        confidence: 0.8,
      };
    }
  }

  // Step 4: Text could not be located with certainty.
  // Rule of thumb: Never silently shift highlights to another location!
  return {
    status: "needs_review",
    startBlockId,
    startOffset,
    endBlockId,
    endOffset,
    confidence: 0,
  };
}
