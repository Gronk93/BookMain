import type { LlmProvider } from "../ai/providers/llm-provider";
import type { AiRetriever } from "../ai/rag/retriever";
import type { ContextSourceItem } from "../ai/rag/context-builder";
import { validateAndFormatCitations } from "../ai/rag/citation-validator";
import {
  createStudySummary,
  findStudySummaryById,
  listStudySummariesByBook,
  deleteStudySummary,
  getBookById,
  getSeparatorById,
  getBookHighlights,
  getBookNotes,
  recordAiUsage,
} from "../../lib/repository";

import {
  buildStudyPromptContext,
  type StudyScopeInput,
} from "./study-context-builder";

export interface GenerateSummaryOptions {
  bookId: string;
  userId: string;
  scope: StudyScopeInput;
  summaryType: "brief" | "standard" | "deep";
  includeHighlights?: boolean;
  includeNotes?: boolean;
  language?: string;
}

export class StudySummaryService {
  constructor(
    private retriever: AiRetriever,
    private llmProvider: LlmProvider,
  ) {}

  async generateSummary(options: GenerateSummaryOptions) {
    const {
      bookId,
      userId,
      scope,
      summaryType = "standard",
      includeHighlights = false,
      includeNotes = false,
      language = "es-MX",
    } = options;

    const book = await getBookById(bookId);
    if (!book || book.userId !== userId || book.deletedAt) {
      throw new Error("BOOK_NOT_FOUND");
    }

    const totalPages = book.totalPages;

    // Validate scope boundaries
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

    // Retrieve context sources based on scope
    let sources: ContextSourceItem[] = [];

    if (scope.type === "page") {
      sources = await this.retriever.retrieve({
        bookId,
        query: `Resumen de la página ${scope.pageNumber}`,
        scope: "page",
        scopeRef: String(scope.pageNumber),
        topK: 6,
      });
    } else if (scope.type === "page_range") {
      const start = scope.startPage ?? 1;
      const end = scope.endPage ?? start;
      sources = await this.retriever.retrieve({
        bookId,
        query: `Resumen de las páginas ${start} a ${end}`,
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
        query: `Resumen de la sección ${sep.title}`,
        scope: "separator",
        separatorRange: { startPage: sep.startPage, endPage: sep.endPage },
        topK: 10,
      });
    } else if (scope.type === "highlights") {
      const allHighlights = await getBookHighlights(bookId, userId);
      // Filter out deleted or needs_review
      const active = allHighlights.filter(
        (h) => !h.deletedAt && h.anchorStatus !== "needs_review",
      );
      if (active.length === 0) {
        throw new Error("NO_HIGHLIGHTS_FOUND");
      }
      sources = active.map((h, idx) => ({
        id: `highlight-${h.id}`,
        pageNumber: h.pageNumber,
        text: h.exactText,
        startBlockId: h.startBlockId,
        startOffset: h.startOffset,
        endBlockId: h.endBlockId,
        endOffset: h.endOffset,
        qualityScore: 100,
      }));
    } else {
      // book scope
      sources = await this.retriever.retrieve({
        bookId,
        query: `Resumen general de las ideas clave del libro ${book.title}`,
        scope: "book",
        topK: 8,
      });
    }

    if (sources.length === 0) {
      throw new Error("NO_EVIDENCE_FOUND");
    }

    // Load user notes if requested
    let userNotesList: Array<{ content: string; pageNumber?: number }> = [];
    if (includeNotes) {
      const notes = await getBookNotes(bookId, userId);
      userNotesList = notes
        .filter((n) => !n.deletedAt)
        .map((n) => ({ content: n.content, pageNumber: n.pageNumber }));
    }


    const builtContext = buildStudyPromptContext(sources, userNotesList, includeNotes);

    // Call LLM
    const systemPrompt = [
      "Eres el asistente de estudio de BookMind.",
      "STUDY_SUMMARY_MODE",
      "Genera un resumen estructurado, fundamentado rigurosamente en las fuentes provistas.",
      "Reglas:",
      "1. El resumen debe basarse exclusivamente en las fuentes dentro de <sources>.",
      "2. Si se incluyen <user_notes>, trátalas como notas personales del lector y no las atribuyas al autor.",
      "3. Devuelve un JSON con: { title, content, usedSourceIds }.",
    ].join("\n");

    const userPrompt = [
      `TASK: STUDY_SUMMARY`,
      `SUMMARY_TYPE: ${summaryType}`,
      `LANGUAGE: ${language}`,
      `INCLUDE_PERSONAL: ${includeNotes && userNotesList.length > 0}`,
      builtContext.contextPrompt,
    ].join("\n\n");

    const llmResult = await this.llmProvider.generate({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 1200,
    });

    let parsedResult: { title: string; content: string; usedSourceIds?: string[] };
    try {
      parsedResult = JSON.parse(llmResult.content);
    } catch {
      parsedResult = {
        title: `Resumen ${summaryType}`,
        content: llmResult.content,
        usedSourceIds: sources.slice(0, 3).map((s) => s.id),
      };
    }

    // Validate citations strictly against retrieved sources
    const validatedCitations = validateAndFormatCitations(
      parsedResult.usedSourceIds || [],
      sources,
      5,
    );

    // Persist summary and sources
    const created = await createStudySummary(
      {
        userId,
        bookId,
        scopeType: scope.type,
        scopeData: scope,
        summaryType,
        title: parsedResult.title || `Resumen ${summaryType}`,
        content: parsedResult.content,
        language,
        isPersonal: builtContext.isPersonal,
        includeHighlights,
        includeNotes,
        generationVersion: 1,
        promptVersion: "1.0",
        sourceHash: builtContext.sourceHash,
        status: "ready",
      },
      validatedCitations.map((c) => ({
        chunkId: c.id,
        bookId,
        pageNumber: c.pageNumber,
        quote: c.quote,
        startBlockId: c.startBlockId ?? null,
        startOffset: c.startOffset ?? null,
        endBlockId: c.endBlockId ?? null,
        endOffset: c.endOffset ?? null,
        rank: c.rank,
      })),
    );

    // Track usage
    await recordAiUsage({
      userId,
      bookId,
      operation: "study_summary",
      provider: this.llmProvider.name,
      model: this.llmProvider.model,
      inputUnits: llmResult.inputTokens,
      outputUnits: llmResult.outputTokens,
      durationMs: llmResult.durationMs,
    });

    return created;
  }
}
