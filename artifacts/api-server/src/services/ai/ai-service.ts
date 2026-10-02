import crypto from "node:crypto";
import type { LlmProvider } from "./providers/llm-provider";
import type { EmbeddingProvider } from "./providers/embedding-provider";
import type { VectorStore } from "./providers/vector-store";
import { MockLlmProvider } from "./providers/mock-llm.provider";
import { MockEmbeddingProvider } from "./providers/mock-embedding.provider";
import { InMemoryVectorStore } from "./providers/in-memory-vector-store";
import { BookAiIndexer, type BookAiIndexStatusData } from "./rag/indexer";
import { AiRetriever } from "./rag/retriever";
import { buildIsolatedContext } from "./rag/context-builder";
import { validateAndFormatCitations, type ValidatedCitation } from "./rag/citation-validator";
import { DictionaryService, type DefineTermOptions, type DefineTermResult } from "./dictionary/dictionary.service";
import { EXPLAIN_SYSTEM_PROMPT, buildExplainUserPrompt } from "./prompts/explain";
import { ASK_BOOK_SYSTEM_PROMPT, buildAskBookUserPrompt } from "./prompts/ask-book";
import type { PageInput } from "./rag/chunker";

export interface ExplainOptions {
  text: string;
  pageNumber: number;
  startBlockId?: string | null;
  startOffset?: number | null;
  endBlockId?: string | null;
  endOffset?: number | null;
  prefixText?: string | null;
  suffixText?: string | null;
}

export interface ExplainResult {
  explanation: string;
  keyConcepts: string[];
  citation: ValidatedCitation;
}

export interface AskBookOptions {
  bookId: string;
  userId: string;
  question: string;
  scope?: "selection" | "page" | "separator" | "book";
  scopeRef?: string | null;
  conversationId?: string | null;
  separatorRange?: { startPage: number; endPage: number } | null;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface AskBookResult {
  conversationId: string;
  messageId: string;
  answer: string;
  citations: ValidatedCitation[];
  insufficientEvidence: boolean;
  confidence: "high" | "medium" | "low" | "none";
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export class AiService {
  readonly llm: LlmProvider;
  readonly embeddingProvider: EmbeddingProvider;
  readonly vectorStore: VectorStore;
  readonly indexer: BookAiIndexer;
  readonly retriever: AiRetriever;
  readonly dictionaryService: DictionaryService;

  constructor(dependencies?: {
    llm?: LlmProvider;
    embeddingProvider?: EmbeddingProvider;
    vectorStore?: VectorStore;
  }) {
    this.llm = dependencies?.llm || new MockLlmProvider();
    this.embeddingProvider =
      dependencies?.embeddingProvider || new MockEmbeddingProvider();
    this.vectorStore =
      dependencies?.vectorStore || new InMemoryVectorStore();

    this.indexer = new BookAiIndexer(this.vectorStore, this.embeddingProvider);
    this.retriever = new AiRetriever(this.vectorStore, this.embeddingProvider);
    this.dictionaryService = new DictionaryService(this.llm);
  }

  async indexBook(bookId: string, pages: PageInput[]) {
    return this.indexer.indexBook(bookId, pages);
  }

  async define(options: DefineTermOptions): Promise<DefineTermResult> {
    return this.dictionaryService.define(options);
  }

  async explain(options: ExplainOptions): Promise<ExplainResult> {
    const {
      text,
      pageNumber,
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      prefixText,
      suffixText,
    } = options;

    const userPrompt = buildExplainUserPrompt(text, pageNumber, prefixText, suffixText);

    const result = await this.llm.generate({
      messages: [
        { role: "system", content: EXPLAIN_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
    });

    let parsed: any;
    try {
      parsed = JSON.parse(result.content);
    } catch {
      parsed = {
        explanation: `Este fragmento aborda: "${text.slice(0, 80)}...". Su significado principal es profundizar en las ideas desarrolladas en esta página.`,
        keyConcepts: ["Concepto central"],
      };
    }

    const citation: ValidatedCitation = {
      id: `cite-explain-${Date.now()}`,
      pageNumber,
      quote: text.length > 150 ? text.slice(0, 147) + "..." : text,
      startBlockId: startBlockId ?? null,
      startOffset: startOffset ?? 0,
      endBlockId: endBlockId ?? null,
      endOffset: endOffset ?? text.length,
      retrievalScore: 1.0,
      rank: 1,
    };

    return {
      explanation: parsed.explanation || "Explicación generada para el fragmento seleccionado.",
      keyConcepts: Array.isArray(parsed.keyConcepts) ? parsed.keyConcepts : [],
      citation,
    };
  }

  async askBook(options: AskBookOptions): Promise<AskBookResult> {
    const {
      bookId,
      userId,
      question,
      scope = "book",
      scopeRef,
      conversationId: existingConversationId,
      separatorRange,
      history = [],
    } = options;

    const conversationId = existingConversationId || crypto.randomUUID();
    const messageId = crypto.randomUUID();

    // 1. Retrieve relevant sources
    const sources = await this.retriever.retrieve({
      bookId,
      query: question,
      scope,
      scopeRef,
      separatorRange,
      topK: 5,
    });

    // 2. Build isolated context
    const isolatedContext = buildIsolatedContext(sources);

    // 3. Format user prompt with context and history (sliding window: up to last 8 messages)
    const recentHistory = history.slice(-8);
    const userPrompt = buildAskBookUserPrompt(question, isolatedContext, scope, scopeRef);

    const messages = [
      { role: "system" as const, content: ASK_BOOK_SYSTEM_PROMPT },
      ...recentHistory.map((h) => ({
        role: h.role,
        content: h.content,
      })),
      { role: "user" as const, content: userPrompt },
    ];

    // 4. Generate answer via LLM
    const llmResult = await this.llm.generate({
      messages,
      temperature: 0.2,
    });

    let parsed: any;
    try {
      parsed = JSON.parse(llmResult.content);
    } catch {
      parsed = {
        answer: llmResult.content,
        insufficientEvidence: sources.length === 0,
        confidence: sources.length > 0 ? "medium" : "none",
        usedSourceIds: sources.slice(0, 2).map((s) => s.id),
      };
    }

    const isSafeRefusal =
      typeof parsed.answer === "string" &&
      (parsed.answer.includes("BookMind") ||
        parsed.answer.includes("solo respondo") ||
        parsed.answer.includes("asistente de lectura"));

    const insufficientEvidence =
      !isSafeRefusal &&
      (Boolean(parsed.insufficientEvidence) ||
        sources.length === 0 ||
        (parsed.answer &&
          parsed.answer.includes("No encontré suficiente información en este libro")));

    const answer = isSafeRefusal
      ? parsed.answer
      : insufficientEvidence
        ? "No encontré suficiente información en este libro para responder con confianza."
        : parsed.answer || "Respuesta basada en el contenido del libro.";

    const confidence = isSafeRefusal
      ? "high"
      : insufficientEvidence
        ? "none"
        : (parsed.confidence as "high" | "medium" | "low" | "none") || "high";

    // 5. Validate citations
    const candidateSourceIds: string[] = insufficientEvidence
      ? []
      : Array.isArray(parsed.usedSourceIds) && parsed.usedSourceIds.length > 0
        ? parsed.usedSourceIds
        : sources.slice(0, 3).map((s) => s.id);

    const citations = insufficientEvidence
      ? []
      : validateAndFormatCitations(candidateSourceIds, sources);

    return {
      conversationId,
      messageId,
      answer,
      citations,
      insufficientEvidence,
      confidence,
      inputTokens: llmResult.inputTokens,
      outputTokens: llmResult.outputTokens,
      durationMs: llmResult.durationMs,
    };
  }
}

// Global singleton instance for application runtime
export const globalAiService = new AiService();
