import type { VectorStore, VectorRecord } from "../providers/vector-store";
import type { EmbeddingProvider } from "../providers/embedding-provider";
import type { ContextSourceItem } from "./context-builder";

export interface RetrieveOptions {
  bookId: string;
  query: string;
  scope: "selection" | "page" | "separator" | "book";
  scopeRef?: string | null;
  topK?: number;
  separatorRange?: { startPage: number; endPage: number } | null;
}

export class AiRetriever {
  constructor(
    private vectorStore: VectorStore,
    private embeddingProvider: EmbeddingProvider,
  ) {}

  async retrieve(options: RetrieveOptions): Promise<ContextSourceItem[]> {
    const { bookId, query, scope, scopeRef, topK = 5, separatorRange } = options;

    // Handle selection scope directly
    if (scope === "selection" && scopeRef) {
      return [
        {
          id: "selection-0",
          pageNumber: 1, // Will be overridden if page context provided
          text: scopeRef,
          startOffset: 0,
          endOffset: scopeRef.length,
          qualityScore: 100,
        },
      ];
    }

    // Embed query
    const { embedding } = await this.embeddingProvider.embedText(query);

    let pageNumbers: number[] | undefined = undefined;

    if (scope === "page" && scopeRef) {
      const pageNum = parseInt(scopeRef, 10);
      if (!isNaN(pageNum)) {
        pageNumbers = [pageNum];
      }
    } else if (scope === "separator" && separatorRange) {
      pageNumbers = [];
      for (let p = separatorRange.startPage; p <= separatorRange.endPage; p++) {
        pageNumbers.push(p);
      }
    }

    const matches = await this.vectorStore.query(
      embedding,
      {
        bookId,
        pageNumbers,
      },
      topK,
    );

    return matches.map((m) => ({
      id: m.record.id,
      pageNumber: m.record.pageNumber,
      chunkIndex: m.record.chunkIndex,
      text: m.record.text,
      startBlockId: m.record.startBlockId,
      startOffset: m.record.startOffset,
      endBlockId: m.record.endBlockId,
      endOffset: m.record.endOffset,
      qualityScore: m.record.qualityScore,
    }));
  }
}
