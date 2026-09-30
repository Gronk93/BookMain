import type { PageType } from "./page-classifier";

export interface QualityEvaluationInput {
  pageType: PageType;
  normalizedText: string;
  ocrRequired: boolean;
  ocrConfidence?: number;
  hasOcrError?: boolean;
}

export interface QualityEvaluationResult {
  qualityScore: number; // 0 to 100
  ocrStatus: "completed" | "low_confidence" | "failed" | "skipped";
  flags: string[];
}

export class QualityEvaluator {
  /**
   * Evaluates text quality and determines OCR status flag according to CTQ-06 and PRD rules.
   */
  evaluate(input: QualityEvaluationInput): QualityEvaluationResult {
    const { pageType, normalizedText, ocrRequired, ocrConfidence, hasOcrError } = input;
    const flags: string[] = [];

    // 1. Blank page: perfect quality score, skipped OCR
    if (pageType === "blank") {
      return {
        qualityScore: 100,
        ocrStatus: "skipped",
        flags: ["blank_page"],
      };
    }

    // 2. OCR was required
    if (ocrRequired) {
      if (hasOcrError || ocrConfidence === undefined) {
        flags.push("ocr_failed");
        return {
          qualityScore: 0,
          ocrStatus: "failed",
          flags,
        };
      }

      const conf = Math.max(0, Math.min(100, ocrConfidence));
      if (conf < 70) {
        flags.push("low_ocr_confidence");
        return {
          qualityScore: Math.round(conf),
          ocrStatus: "low_confidence",
          flags,
        };
      }

      return {
        qualityScore: Math.round(conf),
        ocrStatus: "completed",
        flags,
      };
    }

    // 3. Digital or Hybrid (native text, OCR skipped)
    let score = 98;
    const len = normalizedText.length;

    if (len > 0) {
      // Check for replacement character \uFFFD (bad encoding)
      const replacementMatches = normalizedText.match(/\uFFFD/g);
      if (replacementMatches) {
        const ratio = replacementMatches.length / len;
        if (ratio > 0.05) {
          score -= 30;
          flags.push("encoding_artifacts");
        } else {
          score -= 10;
          flags.push("minor_encoding_artifacts");
        }
      }

      // Check for unreadable gibberish (excessive consecutive consonants or strange symbols)
      const symbolMatches = normalizedText.match(/[^\w\s\.,;:!\?\-\(\)"'¿¡áéíóúüñÁÉÍÓÚÜÑ]/g);
      if (symbolMatches && symbolMatches.length / len > 0.15) {
        score -= 25;
        flags.push("high_symbol_ratio");
      }
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      qualityScore: finalScore,
      ocrStatus: "skipped",
      flags,
    };
  }
}
