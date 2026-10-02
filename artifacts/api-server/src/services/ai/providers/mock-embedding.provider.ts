import type { EmbeddingProvider, EmbeddingResult } from "./embedding-provider";

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = "mock";
  readonly model = "mock-embedding-v1";
  readonly dimensions: number;

  constructor(dimensions: number = 64) {
    this.dimensions = dimensions;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  async embedText(text: string): Promise<EmbeddingResult> {
    const vector = new Array(this.dimensions).fill(0);
    const words = text
      .toLowerCase()
      .replace(/[^\w\s\u00C0-\u017F]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (words.length === 0) {
      vector[0] = 1;
      return { embedding: vector, tokenCount: 0 };
    }

    for (const word of words) {
      const idx = this.simpleHash(word) % this.dimensions;
      vector[idx] += 1;
    }

    // L2 normalize
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = Number((vector[i] / norm).toFixed(6));
      }
    } else {
      vector[0] = 1;
    }

    return {
      embedding: vector,
      tokenCount: words.length,
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((t) => this.embedText(t)));
  }
}
