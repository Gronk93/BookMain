import type { LlmProvider } from "../ai/providers/llm-provider";
import type { AiRetriever } from "../ai/rag/retriever";
import type { ContextSourceItem } from "../ai/rag/context-builder";
import { validateAndFormatCitations } from "../ai/rag/citation-validator";
import {
  createStudyConceptWithSources,
  listStudyConceptsByBook,
  getBookById,
  getSeparatorById,
  recordAiUsage,
} from "../../lib/repository";
import {
  computeSourceHash,
  type StudyScopeInput,
} from "./study-context-builder";
import { buildIsolatedContext } from "../ai/rag/context-builder";

export interface GenerateConceptsOptions {
  bookId: string;
  userId: string;
  scope: StudyScopeInput;
  count?: number;
}

export class StudyConceptService {
  constructor(
    private retriever: AiRetriever,
    private llmProvider: LlmProvider,
  ) {}

  async generateConcepts(options: GenerateConceptsOptions) {
    const { bookId, userId, scope, count = 10 } = options;

    const book = await getBookById(bookId);
    if (!book || book.userId !== userId || book.deletedAt) {
      throw new Error("BOOK_NOT_FOUND");
    }

    const totalPages = book.totalPages;

    if (scope.type === "page_range") {
      const start = scope.startPage ?? 1;
      const end = scope.endPage ?? start;
      if (start < 1 || end < start || end > totalPages) {
        throw new Error("INVALID_PAGE_RANGE");
      }
    } else if (scope.type === "page") {
      const page = scope.pageNumber ?? 1;
      if (page < 1 || page > totalPages) {
        throw new Error("INVALID_PAGE_NUMBER");
      }
    }

    let sources: ContextSourceItem[] = [];

    if (scope.type === "page") {
      sources = await this.retriever.retrieve({
        bookId,
        query: `Conceptos y definiciones de la página ${scope.pageNumber}`,
        scope: "page",
        scopeRef: String(scope.pageNumber),
        topK: 6,
      });
    } else if (scope.type === "page_range") {
      const start = scope.startPage ?? 1;
      const end = scope.endPage ?? start;
      sources = await this.retriever.retrieve({
        bookId,
        query: `Conceptos e ideas fundamentales de las páginas ${start} a ${end}`,
        scope: "separator",
        separatorRange: { startPage: start, endPage: end },
        topK: 10,
      });
    } else if (scope.type === "separator" && scope.separatorId) {
      const sep = await getSeparatorById(scope.separatorId, userId);
      if (!sep || sep.bookId !== bookId) {
        throw new Error("SEPARATOR_NOT_FOUND");
      }
      sources = await this.retriever.retrieve({
        bookId,
        query: `Conceptos de la sección ${sep.title}`,
        scope: "separator",
        separatorRange: { startPage: sep.startPage, endPage: sep.endPage },
        topK: 10,
      });
    } else {
      sources = await this.retriever.retrieve({
        bookId,
        query: `Conceptos principales y definiciones de ${book.title}`,
        scope: "book",
        topK: 8,
      });
    }


    if (sources.length === 0) {
      throw new Error("NO_EVIDENCE_FOUND");
    }

    const sourceHash = computeSourceHash(sources);
    const contextPrompt = buildIsolatedContext(sources);

    const systemPrompt = [
      "Eres el extractor de conceptos de BookMind.",
      "STUDY_CONCEPTS_MODE",
      "Extrae conceptos clave, definiciones rigurosas y explicaciones sencillas, fundamentadas en las fuentes.",
      "Formato: JSON { concepts: [{ term, definition, simpleExplanation, importance, usedSourceIds }] }.",
    ].join("\n");

    const userPrompt = [
      `TASK: STUDY_CONCEPTS`,
      `COUNT: ${count}`,
      contextPrompt,
    ].join("\n\n");

    const llmResult = await this.llmProvider.generate({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 1200,
    });

    let rawConcepts: Array<{
      term: string;
      definition: string;
      simpleExplanation?: string;
      importance?: "essential" | "high" | "medium";
      usedSourceIds?: string[];
    }> = [];

    try {
      const parsed = JSON.parse(llmResult.content);
      rawConcepts = parsed.concepts || [];
    } catch {
      rawConcepts = [
        {
          term: "Concepto fundamental",
          definition: "Definición derivada del texto analizado.",
          simpleExplanation: "Explicación simple.",
          importance: "essential",
          usedSourceIds: sources.slice(0, 1).map((s) => s.id),
        },
      ];
    }

    const createdList = [];

    for (const raw of rawConcepts) {
      const validatedCitations = validateAndFormatCitations(
        raw.usedSourceIds || [],
        sources,
        3,
      );

      const created = await createStudyConceptWithSources(
        {
          userId,
          bookId,
          scopeType: scope.type,
          scopeData: scope,
          term: raw.term,
          definition: raw.definition,
          simpleExplanation: raw.simpleExplanation || null,
          importance: raw.importance || "high",
          sourceHash,
          status: "ready",
        },
        validatedCitations.map((c) => ({
          chunkId: c.id,
          bookId,
          pageNumber: c.pageNumber,
          quote: c.quote,
          rank: c.rank,
        })),
      );

      createdList.push(created);
    }

    await recordAiUsage({
      userId,
      bookId,
      operation: "study_concepts",
      provider: this.llmProvider.name,
      model: this.llmProvider.model,
      inputUnits: llmResult.inputTokens,
      outputUnits: llmResult.outputTokens,
      durationMs: llmResult.durationMs,
    });

    return createdList;
  }
}
