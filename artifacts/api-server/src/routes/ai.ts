import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { requireAuth } from "../middlewares/auth";
import {
  getBookById,
  getBookPagesForIndexing,
  getBookSeparators,
  getBookAiIndex,
  upsertBookAiIndex,
  saveAiChunks,
  createAiConversation,
  getAiConversations,
  getAiConversationById,
  deleteAiConversation,
  createAiMessage,
  getAiMessages,
  createAiMessageSources,
  getAiMessageSources,
  recordAiUsage,
} from "../lib/repository";
import { globalAiService } from "../services/ai/ai-service";

const router: IRouter = Router();

router.use(requireAuth);

// Helper: verify book ownership and active status
async function verifyBookAccess(bookId: string, userId: string) {
  const book = await getBookById(bookId);
  if (!book || book.userId !== userId || book.deletedAt) {
    return null;
  }
  return book;
}

// ==========================================
// 1. AI INDEXING ENDPOINTS
// ==========================================

// POST /books/:bookId/ai/index
router.post("/books/:bookId/ai/index", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const pages = await getBookPagesForIndexing(bookId);
    if (!pages || pages.length === 0) {
      // Mark as ready with 0 chunks if book has no pages yet
      const indexRecord = await upsertBookAiIndex({
        bookId,
        status: "ready",
        chunkCount: 0,
        indexedPageCount: 0,
        completedAt: new Date(),
      });
      res.json({
        id: indexRecord.id,
        bookId,
        status: indexRecord.status,
        indexVersion: indexRecord.indexVersion,
        embeddingModel: indexRecord.embeddingModel,
        chunkCount: 0,
        indexedPageCount: 0,
        totalPages: book.totalPages || 0,
        progressPercent: 100,
        startedAt: indexRecord.startedAt?.toISOString() || null,
        completedAt: indexRecord.completedAt?.toISOString() || null,
      });
      return;
    }

    // Set indexing status
    await upsertBookAiIndex({
      bookId,
      status: "indexing",
      startedAt: new Date(),
    });

    const indexResult = await globalAiService.indexBook(bookId, pages);

    // Save chunks to DB
    await saveAiChunks(
      indexResult.chunks.map((c) => ({
        id: c.id,
        bookId: c.bookId,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        text: c.text,
        textHash: c.textHash,
        startBlockId: c.startBlockId,
        startOffset: c.startOffset,
        endBlockId: c.endBlockId,
        endOffset: c.endOffset,
        tokenCount: c.tokenCount,
        qualityScore: c.qualityScore,
        textSource: "extracted",
        embedding: c.embedding,
        embeddingModel: globalAiService.embeddingProvider.model,
      })),
    );

    // Update index status to ready
    const completedRecord = await upsertBookAiIndex({
      bookId,
      status: "ready",
      chunkCount: indexResult.chunks.length,
      indexedPageCount: pages.length,
      completedAt: new Date(),
    });

    await recordAiUsage({
      userId,
      bookId,
      operation: "index",
      provider: globalAiService.embeddingProvider.name,
      model: globalAiService.embeddingProvider.model,
      inputUnits: indexResult.chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      outputUnits: 0,
      durationMs: 0,
      estimatedCost: "0.0000",
    });

    res.json({
      id: completedRecord.id,
      bookId,
      status: completedRecord.status,
      indexVersion: completedRecord.indexVersion,
      embeddingModel: completedRecord.embeddingModel,
      chunkCount: completedRecord.chunkCount,
      indexedPageCount: completedRecord.indexedPageCount,
      totalPages: book.totalPages || pages.length,
      progressPercent: 100,
      startedAt: completedRecord.startedAt?.toISOString() || null,
      completedAt: completedRecord.completedAt?.toISOString() || null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INDEXING_FAILED", message: err.message || "Failed to index book" },
    });
  }
});

// GET /books/:bookId/ai/index/status
router.get("/books/:bookId/ai/index/status", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const indexRecord = await getBookAiIndex(bookId);
    if (!indexRecord) {
      res.json({
        id: "",
        bookId,
        status: "not_indexed",
        indexVersion: "bm-rag-v1",
        embeddingModel: globalAiService.embeddingProvider.model,
        chunkCount: 0,
        indexedPageCount: 0,
        totalPages: book.totalPages || 0,
        progressPercent: 0,
        startedAt: null,
        completedAt: null,
      });
      return;
    }

    const totalPages = book.totalPages || indexRecord.indexedPageCount || 1;
    const progressPercent =
      indexRecord.status === "ready"
        ? 100
        : Math.round((indexRecord.indexedPageCount / Math.max(totalPages, 1)) * 100);

    res.json({
      id: indexRecord.id,
      bookId,
      status: indexRecord.status,
      indexVersion: indexRecord.indexVersion,
      embeddingModel: indexRecord.embeddingModel,
      chunkCount: indexRecord.chunkCount,
      indexedPageCount: indexRecord.indexedPageCount,
      totalPages,
      progressPercent,
      startedAt: indexRecord.startedAt?.toISOString() || null,
      completedAt: indexRecord.completedAt?.toISOString() || null,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to get index status" },
    });
  }
});

// ==========================================
// 2. CONTEXTUAL DICTIONARY
// ==========================================

// POST /books/:bookId/ai/define
router.post("/books/:bookId/ai/define", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const { term, pageNumber, blockId, offset, contextSentence } = req.body || {};

    if (!term || typeof pageNumber !== "number") {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "term and pageNumber are required" },
      });
      return;
    }

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const result = await globalAiService.define({
      term: String(term).trim(),
      pageNumber,
      blockId: blockId ? String(blockId) : null,
      offset: typeof offset === "number" ? offset : null,
      contextSentence: contextSentence ? String(contextSentence) : null,
    });

    await recordAiUsage({
      userId,
      bookId,
      operation: "define",
      provider: globalAiService.llm.name,
      model: globalAiService.llm.model,
      inputUnits: term.length,
      outputUnits: 150,
      durationMs: 50,
      estimatedCost: "0.0000",
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "DEFINE_FAILED", message: err.message || "Failed to define term" },
    });
  }
});

// ==========================================
// 3. EXPLAIN SELECTION
// ==========================================

// POST /books/:bookId/ai/explain
router.post("/books/:bookId/ai/explain", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const {
      text,
      pageNumber,
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      prefixText,
      suffixText,
    } = req.body || {};

    if (!text || typeof pageNumber !== "number") {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "text and pageNumber are required" },
      });
      return;
    }

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const result = await globalAiService.explain({
      text: String(text).trim(),
      pageNumber,
      startBlockId: startBlockId ? String(startBlockId) : null,
      startOffset: typeof startOffset === "number" ? startOffset : null,
      endBlockId: endBlockId ? String(endBlockId) : null,
      endOffset: typeof endOffset === "number" ? endOffset : null,
      prefixText: prefixText ? String(prefixText) : null,
      suffixText: suffixText ? String(suffixText) : null,
    });

    await recordAiUsage({
      userId,
      bookId,
      operation: "explain",
      provider: globalAiService.llm.name,
      model: globalAiService.llm.model,
      inputUnits: text.length,
      outputUnits: 200,
      durationMs: 60,
      estimatedCost: "0.0000",
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "EXPLAIN_FAILED", message: err.message || "Failed to explain selection" },
    });
  }
});

// ==========================================
// 4. ASK BOOKMIND / CONVERSATION
// ==========================================

// POST /books/:bookId/ai/ask
router.post("/books/:bookId/ai/ask", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;
    const { question, scope = "book", scopeRef, conversationId } = req.body || {};

    if (!question || typeof question !== "string" || !question.trim()) {
      res.status(400).json({
        success: false,
        error: { code: "INVALID_REQUEST", message: "question is required" },
      });
      return;
    }

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    // Auto-index if not indexed yet
    const existingIndex = await getBookAiIndex(bookId);
    if (!existingIndex || existingIndex.status !== "ready") {
      const pages = await getBookPagesForIndexing(bookId);
      if (pages && pages.length > 0) {
        const idxRes = await globalAiService.indexBook(bookId, pages);
        await saveAiChunks(
          idxRes.chunks.map((c) => ({
            id: c.id,
            bookId: c.bookId,
            pageNumber: c.pageNumber,
            chunkIndex: c.chunkIndex,
            text: c.text,
            textHash: c.textHash,
            startBlockId: c.startBlockId,
            startOffset: c.startOffset,
            endBlockId: c.endBlockId,
            endOffset: c.endOffset,
            tokenCount: c.tokenCount,
            qualityScore: c.qualityScore,
            textSource: "extracted",
            embedding: c.embedding,
            embeddingModel: globalAiService.embeddingProvider.model,
          })),
        );
        await upsertBookAiIndex({
          bookId,
          status: "ready",
          chunkCount: idxRes.chunks.length,
          indexedPageCount: pages.length,
          completedAt: new Date(),
        });
      }
    }

    // Separator scope resolution
    let separatorRange: { startPage: number; endPage: number } | null = null;
    if (scope === "separator" && scopeRef) {
      const seps = await getBookSeparators(bookId, userId);
      const match = seps.find((s) => s.id === scopeRef);
      if (match) {
        separatorRange = { startPage: match.startPage, endPage: match.endPage };
      }
    }

    // Handle conversation history
    let activeConversationId = conversationId;
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];

    if (activeConversationId) {
      const conv = await getAiConversationById(activeConversationId);
      if (!conv || conv.bookId !== bookId || conv.userId !== userId) {
        res.status(404).json({
          success: false,
          error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" },
        });
        return;
      }
      const existingMsgs = await getAiMessages(activeConversationId);
      history = existingMsgs.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
    } else {
      // Create new conversation
      const newConv = await createAiConversation({
        userId,
        bookId,
        title: question.trim().slice(0, 60),
        scopeType: scope,
        scopeRef: scopeRef ? String(scopeRef) : null,
      });
      activeConversationId = newConv.id;
    }

    // Perform RAG QA
    const result = await globalAiService.askBook({
      bookId,
      userId,
      question: question.trim(),
      scope,
      scopeRef: scopeRef ? String(scopeRef) : null,
      conversationId: activeConversationId,
      separatorRange,
      history,
    });

    // Save user message
    await createAiMessage({
      conversationId: activeConversationId,
      role: "user",
      content: question.trim(),
    });

    // Save assistant message
    const assistantMsg = await createAiMessage({
      conversationId: activeConversationId,
      role: "assistant",
      content: result.answer,
      model: globalAiService.llm.model,
      provider: globalAiService.llm.name,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    // Save message sources (citations)
    if (result.citations.length > 0) {
      await createAiMessageSources(
        result.citations.map((c) => ({
          messageId: assistantMsg.id,
          chunkId: c.id,
          bookId,
          pageNumber: c.pageNumber,
          quote: c.quote,
          startBlockId: c.startBlockId,
          startOffset: c.startOffset,
          endBlockId: c.endBlockId,
          endOffset: c.endOffset,
          retrievalScore: c.retrievalScore,
          rank: c.rank,
        })),
      );
    }

    await recordAiUsage({
      userId,
      bookId,
      operation: "ask",
      provider: globalAiService.llm.name,
      model: globalAiService.llm.model,
      inputUnits: result.inputTokens,
      outputUnits: result.outputTokens,
      durationMs: result.durationMs,
      estimatedCost: "0.0000",
    });

    res.json({
      conversationId: activeConversationId,
      messageId: assistantMsg.id,
      answer: result.answer,
      citations: result.citations,
      insufficientEvidence: result.insufficientEvidence,
      confidence: result.confidence,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "ASK_FAILED", message: err.message || "Failed to ask book" },
    });
  }
});

// GET /books/:bookId/ai/conversations
router.get("/books/:bookId/ai/conversations", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const conversations = await getAiConversations(userId, bookId);
    res.json(
      conversations.map((c) => ({
        id: c.id,
        userId: c.userId,
        bookId: c.bookId,
        title: c.title,
        scopeType: c.scopeType,
        scopeRef: c.scopeRef,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    );
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to get conversations" },
    });
  }
});

// GET /books/:bookId/ai/conversations/:conversationId
router.get("/books/:bookId/ai/conversations/:conversationId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, conversationId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const conv = await getAiConversationById(conversationId);
    if (!conv || conv.bookId !== bookId || conv.userId !== userId) {
      res.status(404).json({
        success: false,
        error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" },
      });
      return;
    }

    const rawMsgs = await getAiMessages(conversationId);
    const messages = await Promise.all(
      rawMsgs.map(async (m) => {
        const sources = await getAiMessageSources(m.id);
        const insufficientEvidence =
          m.role === "assistant" &&
          m.content.includes("No encontré suficiente información en este libro");

        return {
          id: m.id,
          conversationId: m.conversationId,
          role: m.role,
          content: m.content,
          citations: sources.map((s) => ({
            id: s.id,
            pageNumber: s.pageNumber,
            quote: s.quote,
            startBlockId: s.startBlockId,
            startOffset: s.startOffset,
            endBlockId: s.endBlockId,
            endOffset: s.endOffset,
            retrievalScore: s.retrievalScore,
            rank: s.rank,
          })),
          insufficientEvidence,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    );

    res.json({
      conversation: {
        id: conv.id,
        userId: conv.userId,
        bookId: conv.bookId,
        title: conv.title,
        scopeType: conv.scopeType,
        scopeRef: conv.scopeRef,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
      },
      messages,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to fetch conversation" },
    });
  }
});

// DELETE /books/:bookId/ai/conversations/:conversationId
router.delete("/books/:bookId/ai/conversations/:conversationId", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { bookId, conversationId } = req.params;

    const book = await verifyBookAccess(bookId, userId);
    if (!book) {
      res.status(404).json({
        success: false,
        error: { code: "BOOK_NOT_FOUND", message: "Book not found or access denied" },
      });
      return;
    }

    const conv = await getAiConversationById(conversationId);
    if (!conv || conv.bookId !== bookId || conv.userId !== userId) {
      res.status(404).json({
        success: false,
        error: { code: "CONVERSATION_NOT_FOUND", message: "Conversation not found" },
      });
      return;
    }

    await deleteAiConversation(conversationId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message || "Failed to delete conversation" },
    });
  }
});

export default router;
