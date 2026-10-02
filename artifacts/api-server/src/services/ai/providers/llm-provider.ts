export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmGenerateOptions {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LlmGenerateResult {
  content: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  generate(options: LlmGenerateOptions): Promise<LlmGenerateResult>;
}
