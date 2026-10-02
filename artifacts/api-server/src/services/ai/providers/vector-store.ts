export interface VectorRecord {
  id: string;
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
  qualityScore?: number;
  embedding: number[];
}

export interface VectorQueryFilter {
  bookId: string;
  pageNumbers?: number[];
  minQualityScore?: number;
}

export interface VectorMatch {
  record: VectorRecord;
  similarity: number;
}

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  query(queryVector: number[], filter: VectorQueryFilter, topK: number): Promise<VectorMatch[]>;
  deleteByBookId(bookId: string): Promise<void>;
  count(bookId: string): Promise<number>;
  getByBookId(bookId: string): Promise<VectorRecord[]>;
}
