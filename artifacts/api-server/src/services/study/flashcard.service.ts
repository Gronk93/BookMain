import type { LlmProvider } from "../ai/providers/llm-provider";
import type { AiRetriever } from "../ai/rag/retriever";
import type { ContextSourceItem } from "../ai/rag/context-builder";
import { buildIsolatedContext } from "../ai/rag/context-builder";
import {
  createFlashcardDeck,
  findFlashcardDeckById,
  listFlashcardDecksByBook,
  updateFlashcardDeck,
  deleteFlashcardDeck,
  createFlashcard,
  createBatchFlashcards,
  findFlashcardById,
  listFlashcardsByDeck,
  updateFlashcard,
  deleteFlashcard,
  getBookById,
  getSeparatorById,
  getBookHighlights,
  recordAiUsage,
} from "../../lib/repository";
import {
  computeCardContentHash,
  computeSourceHash,
  type StudyScopeInput,
} from "./study-context-builder";

export interface GenerateFlashcardsOptions {
  deckId: string;
  bookId: string;
  userId: string;
  count?: number; // 5, 10, 20
  cardTypes?: Array<"concept" | "question" | "cloze">;
}

export class FlashcardService {
  constructor(
    private retriever: AiRetriever,
    private llmProvider: LlmProvider,
  ) {}

  async generateFlashcardsForDeck(options: GenerateFlashcardsOptions) {
    const { deckId, bookId, userId, count = 10 } = options;

    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      throw new Error("DECK_NOT_FOUND");
    }

    const book = await getBookById(bookId);
    if (!book || book.userId !== userId || book.deletedAt) {
      throw new Error("BOOK_NOT_FOUND");
    }

    const scope = deck.scopeData as StudyScopeInput;
    let sources: ContextSourceItem[] = [];

    if (scope.type === "page") {
      sources = await this.retriever.retrieve({
        bookId,
        query: `Flashcards y preguntas clave de la página ${scope.pageNumber}`,
        scope: "page",
        scopeRef: String(scope.pageNumber),
        topK: 6,
      });
    } else if (scope.type === "page_range") {
      const start = scope.startPage ?? 1;
      const end = scope.endPage ?? start;
      sources = await this.retriever.retrieve({
        bookId,
        query: `Flashcards de las páginas ${start} a ${end}`,
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
        query: `Flashcards para la sección ${sep.title}`,
        scope: "separator",
        separatorRange: { startPage: sep.startPage, endPage: sep.endPage },
        topK: 10,
      });
    } else if (scope.type === "highlights") {
      const highlights = await getBookHighlights(bookId, userId);
      const active = highlights.filter(
        (h) => !h.deletedAt && h.anchorStatus !== "needs_review",
      );
      if (active.length === 0) {
        throw new Error("NO_HIGHLIGHTS_FOUND");
      }
      sources = active.map((h) => ({
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
      sources = await this.retriever.retrieve({
        bookId,
        query: `Tarjetas de estudio esenciales del libro ${book.title}`,
        scope: "book",
        topK: 12,
      });
    }


    if (sources.length === 0) {
      throw new Error("NO_EVIDENCE_FOUND");
    }

    const sourceHash = computeSourceHash(sources);
    const contextPrompt = buildIsolatedContext(sources);

    const sourceMap = new Map<string, ContextSourceItem>();
    for (const s of sources) {
      sourceMap.set(s.id, s);
    }

    const systemPrompt = [
      "Eres el generador de flashcards de BookMind.",
      "STUDY_FLASHCARDS_MODE",
      "Genera tarjetas de estudio grounded de alta calidad.",
      "Tipos permitidos: 'concept', 'question', 'cloze'.",
      "Cada tarjeta DEBE fundamentarse en un fragmento de las fuentes e indicar el ID de la fuente válida en usedSourceIds.",
      "Formato: JSON { flashcards: [{ cardType, front, back, explanation, sourcePage, usedSourceIds }] }.",
    ].join("\n");

    const userPrompt = [
      `TASK: STUDY_FLASHCARDS`,
      `COUNT: ${count}`,
      contextPrompt,
    ].join("\n\n");

    const llmResult = await this.llmProvider.generate({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      maxTokens: 1600,
    });

    let rawCards: Array<{
      cardType: "concept" | "question" | "cloze";
      front: string;
      back: string;
      explanation?: string;
      sourcePage?: number;
      usedSourceIds?: string[];
    }> = [];

    try {
      const parsed = JSON.parse(llmResult.content);
      rawCards = parsed.flashcards || [];
    } catch {
      rawCards = [];
    }

    // Existing cards in this deck to detect duplicates
    const existingCards = await listFlashcardsByDeck(deckId, userId);
    const existingHashes = new Set(existingCards.map((c) => c.contentHash));

    const validCardsToCreate = [];

    for (const raw of rawCards) {
      // CTQ BM-08-04 & Section 79: Strict Grounding Check
      // An AI card without a valid source present in retrieved context MUST be rejected!
      let matchedSource: ContextSourceItem | undefined = undefined;
      if (raw.usedSourceIds && raw.usedSourceIds.length > 0) {
        for (const srcId of raw.usedSourceIds) {
          const s = sourceMap.get(srcId);
          if (s) {
            matchedSource = s;
            break;
          }
        }
      }

      // If no valid source ID from retrieved context was cited: REJECT
      if (!matchedSource) {
        continue;
      }

      const contentHash = computeCardContentHash(raw.front, raw.back);

      // Section 82 & 83: Avoid duplicate cards in deck
      if (existingHashes.has(contentHash)) {
        continue;
      }
      existingHashes.add(contentHash);

      validCardsToCreate.push({
        deckId,
        userId,
        bookId,
        cardType: raw.cardType || "question",
        origin: "ai" as const,
        front: raw.front,
        back: raw.back,
        explanation: raw.explanation || null,
        sourcePage: matchedSource.pageNumber,
        sourceAnchorData: {
          chunkId: matchedSource.id,
          pageNumber: matchedSource.pageNumber,
          startBlockId: matchedSource.startBlockId || null,
          endBlockId: matchedSource.endBlockId || null,
        },
        contentHash,
        sourceHash,
        difficulty: "medium",
        status: "ready",
      });
    }

    const createdCards = await createBatchFlashcards(validCardsToCreate);

    await recordAiUsage({
      userId,
      bookId,
      operation: "flashcard_generation",
      provider: this.llmProvider.name,
      model: this.llmProvider.model,
      inputUnits: llmResult.inputTokens,
      outputUnits: llmResult.outputTokens,
      durationMs: llmResult.durationMs,
    });

    return createdCards;
  }

  async createManualCard(
    deckId: string,
    bookId: string,
    userId: string,
    data: {
      cardType?: "concept" | "question" | "cloze";
      front: string;
      back: string;
      explanation?: string | null;
      sourcePage?: number | null;
    },
  ) {
    const deck = await findFlashcardDeckById(deckId, userId);
    if (!deck || deck.bookId !== bookId) {
      throw new Error("DECK_NOT_FOUND");
    }

    const contentHash = computeCardContentHash(data.front, data.back);

    return await createFlashcard({
      deckId,
      userId,
      bookId,
      cardType: data.cardType || "question",
      origin: "manual",
      front: data.front,
      back: data.back,
      explanation: data.explanation || null,
      sourcePage: data.sourcePage ?? null,
      sourceAnchorData: null,
      contentHash,
      sourceHash: null,
      difficulty: "medium",
      status: "ready",
    });
  }
}
