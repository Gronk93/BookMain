export interface OcrInput {
  imageBuffer: Buffer;
  mimeType?: string;
  language?: string;
  pageNumber: number;
  options?: Record<string, any>;
}

export interface OcrBlock {
  text: string;
  confidence: number; // 0 to 100
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface OcrResult {
  text: string;
  confidence: number; // 0 to 100
  blocks: OcrBlock[];
  executionTimeMs: number;
  provider: string;
}

export interface OcrProvider {
  readonly name: string;
  recognize(input: OcrInput): Promise<OcrResult>;
}
