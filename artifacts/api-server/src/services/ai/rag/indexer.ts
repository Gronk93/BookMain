import crypto from "node:crypto";
import type { VectorStore, VectorRecord } from "../providers/vector-store";
import type { EmbeddingProvider } from "../providers/embedding-provider";
import { chunkPage, type PageInput } from "./chunker";

export interface BookAiIndexStatusData {
  id: string;
  bookId: string;
  status: "not_indexed" | "indexing" | "ready" | "failed";
  indexVersion: string;
  embeddingModel: string;
  chunkCount: number;
  indexedPageCount: number;
  totalPages: number;
  progressPercent: number;
  startedAt?: string | null;
  completedAt?: string | null;
}

export class BookAiIndexer {
  constructor(
    private vectorStore: VectorStore,
    private embeddingProvider: EmbeddingProvider,
  ) {}

  async indexBook(
    bookId: string,
    pages: PageInput[],
    onProgress?: (indexedPages: number, totalPages: number) => void,
  ): Promise<{
    indexStatus: BookAiIndexStatusData;
    chunks: VectorRecord[];
  }> {
    const totalPages = pages.length;
    const startedAt = new Date().toISOString();

    // 1. Chunk all pages
    const allRawChunks = pages.flatMap((p) => chunkPage(p));

    // 2. Clear old vectors for this book
    await this.vectorStore.deleteByBookId(bookId);

    // 3. Generate embeddings
    const vectorRecords: VectorRecord[] = [];
    const batchSize = 10;

    for (let i = 0; i < allRawChunks.length; i += batchSize) {
      const batch = allRawChunks.slice(i, i + batchSize);
      const embeddings = await this.embeddingProvider.embedBatch(batch.map((b) => b.text));

      for (let j = 0; j < batch.length; j++) {
        const raw = batch[j];
        const emb = embeddings[j];
        const recordId = crypto.randomUUID();

        vectorRecords.push({
          id: recordId,
          bookId: raw.bookId,
          pageNumber: raw.pageNumber,
          chunkIndex: raw.chunkIndex,
          text: raw.text,
          textHash: raw.textHash,
          startBlockId: raw.startBlockId,
          startOffset: raw.startOffset,
          endBlockId: raw.endBlockId,
          endOffset: raw.endOffset,
          tokenCount: raw.tokenCount,
          qualityScore: raw.qualityScore,
          embedding: emb.embedding,
        });
      }
    }

    // 4. Upsert into vector store
    await this.vectorStore.upsert(vectorRecords);

    const completedAt = new Date().toISOString();
    const statusData: BookAiIndexStatusData = {
      id: crypto.randomUUID(),
      bookId,
      status: "ready",
      indexVersion: "bm-rag-v1",
      embeddingModel: this.embeddingProvider.model,
      chunkCount: vectorRecords.length,
      indexedPageCount: totalPages,
      totalPages,
      progressPercent: 100,
      startedAt,
      completedAt,
    };

    if (onProgress) {
      onProgress(totalPages, totalPages);
    }

    return {
      indexStatus: statusData,
      chunks: vectorRecords,
    };
  }
}
