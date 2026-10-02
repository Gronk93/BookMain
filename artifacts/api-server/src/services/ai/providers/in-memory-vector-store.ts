import type {
  VectorStore,
  VectorRecord,
  VectorQueryFilter,
  VectorMatch,
} from "./vector-store";

export class InMemoryVectorStore implements VectorStore {
  private records = new Map<string, VectorRecord>();

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
    }
    return dot;
  }

  async upsert(newRecords: VectorRecord[]): Promise<void> {
    for (const record of newRecords) {
      this.records.set(record.id, record);
    }
  }

  async query(
    queryVector: number[],
    filter: VectorQueryFilter,
    topK: number,
  ): Promise<VectorMatch[]> {
    const matches: VectorMatch[] = [];

    for (const record of this.records.values()) {
      if (record.bookId !== filter.bookId) continue;
      if (filter.pageNumbers && !filter.pageNumbers.includes(record.pageNumber)) {
        continue;
      }
      if (
        filter.minQualityScore !== undefined &&
        (record.qualityScore ?? 100) < filter.minQualityScore
      ) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryVector, record.embedding);
      matches.push({ record, similarity });
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, topK);
  }

  async deleteByBookId(bookId: string): Promise<void> {
    for (const [id, record] of this.records.entries()) {
      if (record.bookId === bookId) {
        this.records.delete(id);
      }
    }
  }

  async count(bookId: string): Promise<number> {
    let cnt = 0;
    for (const record of this.records.values()) {
      if (record.bookId === bookId) {
        cnt++;
      }
    }
    return cnt;
  }

  async getByBookId(bookId: string): Promise<VectorRecord[]> {
    const list: VectorRecord[] = [];
    for (const record of this.records.values()) {
      if (record.bookId === bookId) {
        list.push(record);
      }
    }
    return list;
  }
}
