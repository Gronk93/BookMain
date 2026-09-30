export interface NormalizedTextResult {
  rawText: string;
  normalizedText: string;
  characterCount: number;
  wordCount: number;
}

export class TextNormalizer {
  /**
   * Normalizes raw extracted or OCR text according to BM-PRD-04 specs.
   * Preserves rawText while producing a clean, searchable normalizedText.
   */
  normalize(rawText: string): NormalizedTextResult {
    if (!rawText || rawText.trim().length === 0) {
      return {
        rawText: rawText || "",
        normalizedText: "",
        characterCount: 0,
        wordCount: 0,
      };
    }

    // 1. Unicode NFC normalization
    let text = rawText.normalize("NFC");

    // 2. Normalize non-standard whitespace characters (NBSP, zero-width spaces, thin spaces)
    text = text.replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, " ");

    // 3. Remove non-printable control characters (keep \n, \t, \r)
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");

    // 4. Reconnect hyphenated words across line breaks (e.g., "informa-\nción" -> "información")
    // Works with Spanish/English characters
    text = text.replace(/([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]{2,})-\s*(?:\r?\n|\r)\s*([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]{2,})/g, "$1$2");

    // 5. Clean line trailing/leading whitespace and standardize line endings
    const lines = text.split(/\r?\n/).map((line) => line.replace(/[ \t]+/g, " ").trim());

    // 6. Collapse excessive consecutive blank lines (limit to max 2)
    const collapsedLines: string[] = [];
    let consecutiveBlanks = 0;

    for (const line of lines) {
      if (line.length === 0) {
        consecutiveBlanks++;
        if (consecutiveBlanks <= 2) {
          collapsedLines.push("");
        }
      } else {
        consecutiveBlanks = 0;
        collapsedLines.push(line);
      }
    }

    const normalizedText = collapsedLines.join("\n").trim();
    const characterCount = normalizedText.length;
    const words = normalizedText.length > 0 ? normalizedText.split(/\s+/).filter(Boolean) : [];
    const wordCount = words.length;

    return {
      rawText,
      normalizedText,
      characterCount,
      wordCount,
    };
  }
}
