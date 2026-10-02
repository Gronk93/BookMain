import {
  getDb,
  checkDatabaseHealth,
  usersTable,
  userPreferencesTable,
  booksTable,
  bookFilesTable,
  bookPagesTable,
  readingProgressTable,
  bookmarksTable,
  notesTable,
  highlightsTable,
  separatorsTable,
  processingJobsTable,
  bookAiIndexesTable,
  aiChunksTable,
  aiConversationsTable,
  aiMessagesTable,
  aiMessageSourcesTable,
  aiUsageTable,
  type User,
  type UserPreferences,
  type Book,
  type BookFile,
  type BookPage,
  type InsertBookPage,
  type ReadingProgress,
  type Bookmark,
  type Note,
  type InsertNote,
  type Highlight,
  type InsertHighlight,
  type Separator,
  type InsertSeparator,
  type ProcessingJob,
  type BookAiIndex,
  type InsertBookAiIndex,
  type AiChunk,
  type InsertAiChunk,
  type AiConversation,
  type InsertAiConversation,
  type AiMessage,
  type InsertAiMessage,
  type AiMessageSource,
  type InsertAiMessageSource,
  type AiUsage,
  type InsertAiUsage,
} from "@workspace/db";
import { eq, and, desc, isNull, sql, inArray } from "drizzle-orm";
import crypto from "node:crypto";
import { hashPassword } from "./auth";
import { computeTextHash, resolveAnchor } from "./anchoring";

export type {
  User,
  UserPreferences,
  Book,
  BookFile,
  BookPage,
  InsertBookPage,
  ReadingProgress,
  Bookmark,
  Note,
  InsertNote,
  Highlight,
  InsertHighlight,
  Separator,
  InsertSeparator,
  ProcessingJob,
  BookAiIndex,
  InsertBookAiIndex,
  AiChunk,
  InsertAiChunk,
  AiConversation,
  InsertAiConversation,
  AiMessage,
  InsertAiMessage,
  AiMessageSource,
  InsertAiMessageSource,
  AiUsage,
  InsertAiUsage,
};

// Types matching API contract
export interface BookSummaryData {
  id: string;
  title: string;
  author?: string;
  totalPages: number;
  currentPage: number;
  progressPercent: number;
  coverUrl?: string;
  sourceType: string;
  processingStatus: string;
  lastReadAt?: string;
  createdAt?: string;
}

export interface BookDetailData {
  book: BookSummaryData;
  pages: BookPage[];
  progress: ReadingProgress;
  bookmarks: Bookmark[];
  notes: Note[];
}

// In-Memory Database Store for testing and offline environments
interface InMemoryStore {
  users: Map<string, User>;
  preferences: Map<string, UserPreferences>;
  books: Map<string, Book>;
  bookFiles: Map<string, BookFile>; // key: bookId
  pages: Map<string, BookPage[]>;
  progress: Map<string, ReadingProgress>; // key: `${userId}:${bookId}`
  bookmarks: Map<string, Bookmark>;
  notes: Map<string, Note>;
  highlights: Map<string, Highlight>;
  separators: Map<string, Separator>;
  processingJobs: Map<string, ProcessingJob>; // key: bookId
  bookAiIndexes: Map<string, BookAiIndex>; // key: bookId
  aiChunks: Map<string, AiChunk>; // key: chunkId
  aiConversations: Map<string, AiConversation>; // key: conversationId
  aiMessages: Map<string, AiMessage>; // key: messageId
  aiMessageSources: Map<string, AiMessageSource>; // key: sourceId
  aiUsage: Map<string, AiUsage>; // key: usageId
}

const memoryStore: InMemoryStore = {
  users: new Map(),
  preferences: new Map(),
  books: new Map(),
  bookFiles: new Map(),
  pages: new Map(),
  progress: new Map(),
  bookmarks: new Map(),
  notes: new Map(),
  highlights: new Map(),
  separators: new Map(),
  processingJobs: new Map(),
  bookAiIndexes: new Map(),
  aiChunks: new Map(),
  aiConversations: new Map(),
  aiMessages: new Map(),
  aiMessageSources: new Map(),
  aiUsage: new Map(),
};

// Initial sample books to seed for any user
const SAMPLE_BOOKS = [
  {
    title: "Ways of Seeing",
    author: "John Berger",
    totalPages: 176,
    currentPage: 48,
    coverUrl: "",
    sourceType: "sample",
    pages: [
      {
        pageNumber: 1,
        textContent: "Seeing comes before words. The child looks and recognizes before it can speak.",
      },
      {
        pageNumber: 48,
        textContent:
          "The child looks and recognizes before it can speak. But there is also another sense in which seeing comes before words. It is seeing which shapes our place in the world and determines what we notice.",
      },
      {
        pageNumber: 49,
        textContent:
          "Soon after we can see, we are aware that we can also be seen. The eye of the other combines with our own eye to make it fully credible that we are part of the visible world.",
      },
    ],
  },
  {
    title: "The Living Mountain",
    author: "Nan Shepherd",
    totalPages: 160,
    currentPage: 22,
    coverUrl: "",
    sourceType: "sample",
    pages: [
      {
        pageNumber: 1,
        textContent:
          "Summer on the high plateau can be subtle and violent in the space of an hour. The mountain does not give itself up easily.",
      },
      {
        pageNumber: 22,
        textContent:
          "Water is the living breath of the Cairngorms. To know water is to know the stone it moves across and the silent sky above.",
      },
    ],
  },
  {
    title: "The Waves",
    author: "Virginia Woolf",
    totalPages: 212,
    currentPage: 1,
    coverUrl: "",
    sourceType: "sample",
    pages: [
      {
        pageNumber: 1,
        textContent:
          "The sun had not yet risen. The sea was indistinguishable from the sky, except that the sea was slightly creased as if a cloth had wrinkles in it.",
      },
    ],
  },
];

export async function isDbAvailable(): Promise<boolean> {
  return await checkDatabaseHealth();
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const result = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
    return result[0] || null;
  }

  for (const user of memoryStore.users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase().trim()) {
      return user;
    }
  }
  return null;
}

export async function findUserById(id: string): Promise<User | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const result = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return result[0] || null;
  }
  return memoryStore.users.get(id) || null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  displayName?: string;
}): Promise<User> {
  const id = crypto.randomUUID();
  const now = new Date();
  const normalizedEmail = data.email.toLowerCase().trim();

  const user: User = {
    id,
    email: normalizedEmail,
    passwordHash: data.passwordHash,
    displayName: data.displayName || normalizedEmail.split("@")[0],
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    await db.insert(usersTable).values(user);
    // create default preferences
    await db.insert(userPreferencesTable).values({
      id: crypto.randomUUID(),
      userId: id,
      language: "es-MX",
      theme: "system",
      readingMode: "standard",
      fontSize: "medium",
      readerViewMode: "auto",
      readerLayout: "single",
      readerTheme: "paper",
      readerFontFamily: "serif",
      readerFontSize: 18,
      readerLineHeight: "normal",
      readerMargin: "normal",
      readerPageAnimation: "page",
      readerZoom: 100,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    memoryStore.users.set(id, user);
    memoryStore.preferences.set(id, {
      id: crypto.randomUUID(),
      userId: id,
      language: "es-MX",
      theme: "system",
      readingMode: "standard",
      fontSize: "medium",
      readerViewMode: "auto",
      readerLayout: "single",
      readerTheme: "paper",
      readerFontFamily: "serif",
      readerFontSize: 18,
      readerLineHeight: "normal",
      readerMargin: "normal",
      readerPageAnimation: "page",
      readerZoom: 100,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Seed initial books for this user
  await seedBooksForUser(id);

  return user;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const res = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId)).limit(1);
    if (res[0]) return res[0];
  }

  const existing = memoryStore.preferences.get(userId);
  if (existing) return existing;

  const defaultPref: UserPreferences = {
    id: crypto.randomUUID(),
    userId,
    language: "es-MX",
    theme: "system",
    readingMode: "standard",
    fontSize: "medium",
    readerViewMode: "auto",
    readerLayout: "single",
    readerTheme: "paper",
    readerFontFamily: "serif",
    readerFontSize: 18,
    readerLineHeight: "normal",
    readerMargin: "normal",
    readerPageAnimation: "page",
    readerZoom: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.preferences.set(userId, defaultPref);
  return defaultPref;
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, "id" | "userId" | "createdAt" | "updatedAt">>,
): Promise<UserPreferences> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const existing = await getUserPreferences(userId);
    const updated = {
      ...existing,
      ...updates,
      updatedAt: now,
    };
    await db
      .update(userPreferencesTable)
      .set(updated)
      .where(eq(userPreferencesTable.userId, userId));
    return updated;
  }

  const existing = await getUserPreferences(userId);
  const updated: UserPreferences = {
    ...existing,
    ...updates,
    updatedAt: now,
  };
  memoryStore.preferences.set(userId, updated);
  return updated;
}

export async function seedBooksForUser(userId: string): Promise<void> {
  const db = getDb();
  const useDb = db && (await checkDatabaseHealth());

  for (const sample of SAMPLE_BOOKS) {
    const bookId = crypto.randomUUID();
    const now = new Date();

    const book: Book = {
      id: bookId,
      userId,
      title: sample.title,
      author: sample.author,
      totalPages: sample.totalPages,
      currentPage: sample.currentPage,
      coverUrl: sample.coverUrl,
      sourceType: sample.sourceType,
      processingStatus: "ready",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const progressPercent = Math.round((sample.currentPage / sample.totalPages) * 100);
    const progress: ReadingProgress = {
      id: crypto.randomUUID(),
      userId,
      bookId,
      currentPage: sample.currentPage,
      progressPercent,
      completed: sample.currentPage >= sample.totalPages,
      lastReadAt: now,
      updatedAt: now,
    };

    const pages: BookPage[] = sample.pages.map((p) => ({
      id: crypto.randomUUID(),
      bookId,
      pageNumber: p.pageNumber,
      pageType: "digital",
      rawText: p.textContent,
      normalizedText: p.textContent,
      textContent: p.textContent,
      textSource: "native",
      characterCount: p.textContent.length,
      wordCount: p.textContent.split(/\s+/).filter(Boolean).length,
      ocrRequired: false,
      ocrStatus: "skipped",
      ocrConfidence: 100,
      qualityScore: 100,
      width: 612,
      height: 792,
      rotation: 0,
      previewPath: null,
      textBlocks: [],
      parserVersion: "seed-1.0.0",
      ocrVersion: null,
      isBlank: false,
      contentHash: null,
      processedAt: now,
      createdAt: now,
      updatedAt: now,
    }));

    if (useDb && db) {
      await db.insert(booksTable).values(book);
      await db.insert(readingProgressTable).values(progress);
      for (const p of pages) {
        await db.insert(bookPagesTable).values(p);
      }
    } else {
      memoryStore.books.set(bookId, book);
      memoryStore.progress.set(`${userId}:${bookId}`, progress);
      memoryStore.pages.set(bookId, pages);
    }
  }
}

export async function getUserBooks(userId: string): Promise<BookSummaryData[]> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const books = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.userId, userId), isNull(booksTable.deletedAt)));

    const summaries: BookSummaryData[] = [];
    for (const b of books) {
      const prog = await db
        .select()
        .from(readingProgressTable)
        .where(and(eq(readingProgressTable.userId, userId), eq(readingProgressTable.bookId, b.id)))
        .limit(1);
      const currentProg = prog[0];
      summaries.push({
        id: b.id,
        title: b.title,
        author: b.author || undefined,
        totalPages: b.totalPages,
        currentPage: currentProg?.currentPage ?? b.currentPage,
        progressPercent: currentProg?.progressPercent ?? Math.round((b.currentPage / (b.totalPages || 1)) * 100),
        coverUrl: b.coverUrl || undefined,
        sourceType: b.sourceType,
        processingStatus: b.processingStatus,
        lastReadAt: currentProg?.lastReadAt?.toISOString(),
        createdAt: b.createdAt.toISOString(),
      });
    }
    return summaries;
  }

  // Memory fallback
  const userBooks: BookSummaryData[] = [];
  for (const b of memoryStore.books.values()) {
    if (b.userId === userId && !b.deletedAt) {
      const prog = memoryStore.progress.get(`${userId}:${b.id}`);
      userBooks.push({
        id: b.id,
        title: b.title,
        author: b.author || undefined,
        totalPages: b.totalPages,
        currentPage: prog?.currentPage ?? b.currentPage,
        progressPercent: prog?.progressPercent ?? Math.round((b.currentPage / (b.totalPages || 1)) * 100),
        coverUrl: b.coverUrl || undefined,
        sourceType: b.sourceType,
        processingStatus: b.processingStatus,
        lastReadAt: prog?.lastReadAt?.toISOString(),
        createdAt: b.createdAt.toISOString(),
      });
    }
  }
  return userBooks;
}

export async function getBookDetails(bookId: string, userId: string): Promise<BookDetailData | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const bookRes = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);

    const b = bookRes[0];
    if (!b) return null;

    const pages = await db
      .select()
      .from(bookPagesTable)
      .where(eq(bookPagesTable.bookId, bookId));

    const progRes = await db
      .select()
      .from(readingProgressTable)
      .where(and(eq(readingProgressTable.userId, userId), eq(readingProgressTable.bookId, bookId)))
      .limit(1);

    const progress: ReadingProgress = progRes[0] || {
      id: crypto.randomUUID(),
      userId,
      bookId,
      currentPage: b.currentPage,
      progressPercent: Math.round((b.currentPage / (b.totalPages || 1)) * 100),
      completed: false,
      lastReadAt: new Date(),
      updatedAt: new Date(),
    };

    const bookmarks = await db
      .select()
      .from(bookmarksTable)
      .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.bookId, bookId)));

    const notes = await db
      .select()
      .from(notesTable)
      .where(and(eq(notesTable.userId, userId), eq(notesTable.bookId, bookId), isNull(notesTable.deletedAt)));

    return {
      book: {
        id: b.id,
        title: b.title,
        author: b.author || undefined,
        totalPages: b.totalPages,
        currentPage: progress.currentPage,
        progressPercent: progress.progressPercent,
        coverUrl: b.coverUrl || undefined,
        sourceType: b.sourceType,
        processingStatus: b.processingStatus,
        lastReadAt: progress.lastReadAt.toISOString(),
        createdAt: b.createdAt.toISOString(),
      },
      pages,
      progress,
      bookmarks,
      notes,
    };
  }

  // Memory fallback
  const b = memoryStore.books.get(bookId);
  if (!b || b.userId !== userId || b.deletedAt) {
    return null;
  }

  const pages = memoryStore.pages.get(bookId) || [];
  let progress = memoryStore.progress.get(`${userId}:${bookId}`);
  if (!progress) {
    progress = {
      id: crypto.randomUUID(),
      userId,
      bookId,
      currentPage: b.currentPage,
      progressPercent: Math.round((b.currentPage / (b.totalPages || 1)) * 100),
      completed: false,
      lastReadAt: new Date(),
      updatedAt: new Date(),
    };
    memoryStore.progress.set(`${userId}:${bookId}`, progress);
  }

  const bookmarks: Bookmark[] = [];
  for (const bm of memoryStore.bookmarks.values()) {
    if (bm.userId === userId && bm.bookId === bookId) {
      bookmarks.push(bm);
    }
  }

  const notes: Note[] = [];
  for (const n of memoryStore.notes.values()) {
    if (n.userId === userId && n.bookId === bookId && !n.deletedAt) {
      notes.push(n);
    }
  }

  return {
    book: {
      id: b.id,
      title: b.title,
      author: b.author || undefined,
      totalPages: b.totalPages,
      currentPage: progress.currentPage,
      progressPercent: progress.progressPercent,
      coverUrl: b.coverUrl || undefined,
      sourceType: b.sourceType,
      processingStatus: b.processingStatus,
      lastReadAt: progress.lastReadAt.toISOString(),
      createdAt: b.createdAt.toISOString(),
    },
    pages,
    progress,
    bookmarks,
    notes,
  };
}

// ---------------------------------------------------------------------------
// BM-PRD-03: PDF Ingestion, File, and Duplicate Management
// ---------------------------------------------------------------------------

export async function findBookFileByChecksum(
  userId: string,
  checksumSha256: string,
): Promise<{ book: Book; file: BookFile } | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .select({
        book: booksTable,
        file: bookFilesTable,
      })
      .from(bookFilesTable)
      .innerJoin(booksTable, eq(bookFilesTable.bookId, booksTable.id))
      .where(
        and(
          eq(booksTable.userId, userId),
          eq(bookFilesTable.checksumSha256, checksumSha256),
          isNull(booksTable.deletedAt),
        ),
      )
      .limit(1);

    if (res[0]) {
      return {
        book: res[0].book,
        file: res[0].file,
      };
    }
    return null;
  }

  // Memory fallback
  for (const file of memoryStore.bookFiles.values()) {
    if (file.checksumSha256 === checksumSha256) {
      const book = memoryStore.books.get(file.bookId);
      if (book && book.userId === userId && !book.deletedAt) {
        return { book, file };
      }
    }
  }
  return null;
}

export async function createBookWithFileAndJob(
  userId: string,
  data: {
    book: {
      id?: string;
      title: string;
      author?: string;
      totalPages: number;
      coverUrl?: string;
      sourceType?: string;
      processingStatus?: string;
    };
    file: {
      id?: string;
      originalFilename: string;
      filePath: string;
      fileSizeBytes: number;
      mimeType?: string;
      checksumSha256: string;
      storageProvider?: string;
    };
    job?: {
      id?: string;
      jobType?: string;
      status?: string;
      stage?: string;
      progressPercent?: number;
    };
  },
): Promise<{ book: Book; file: BookFile; job: ProcessingJob }> {
  const now = new Date();
  const bookId = data.book.id || crypto.randomUUID();
  const fileId = data.file.id || crypto.randomUUID();
  const jobId = data.job?.id || crypto.randomUUID();

  const newBook: Book = {
    id: bookId,
    userId,
    title: data.book.title,
    author: data.book.author || null,
    totalPages: data.book.totalPages,
    currentPage: 1,
    coverUrl: data.book.coverUrl || null,
    sourceType: data.book.sourceType || "pdf",
    processingStatus: data.book.processingStatus || "ready_for_processing",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const newFile: BookFile = {
    id: fileId,
    bookId,
    originalFilename: data.file.originalFilename,
    filePath: data.file.filePath,
    fileSizeBytes: data.file.fileSizeBytes,
    mimeType: data.file.mimeType || "application/pdf",
    checksumSha256: data.file.checksumSha256,
    storageProvider: data.file.storageProvider || "local",
    uploadStatus: "uploaded",
    createdAt: now,
    updatedAt: now,
  };

  const newJob: ProcessingJob = {
    id: jobId,
    bookId,
    jobType: data.job?.jobType || "pdf_ingestion",
    status: data.job?.status || "completed",
    stage: data.job?.stage || "ingestion_complete",
    progressPercent: data.job?.progressPercent ?? 100,
    attempt: 1,
    processedPages: data.book.totalPages,
    totalPages: data.book.totalPages,
    errorCode: null,
    errorMessageSafe: null,
    errorMessage: null,
    summary: null,
    createdAt: now,
    updatedAt: now,
  };

  const initialProgress: ReadingProgress = {
    id: crypto.randomUUID(),
    userId,
    bookId,
    currentPage: 1,
    progressPercent: 0,
    completed: false,
    lastReadAt: now,
    updatedAt: now,
  };

  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    await db.transaction(async (tx) => {
      await tx.insert(booksTable).values(newBook);
      await tx.insert(bookFilesTable).values(newFile);
      await tx.insert(processingJobsTable).values(newJob);
      await tx.insert(readingProgressTable).values(initialProgress);
    });
  } else {
    memoryStore.books.set(bookId, newBook);
    memoryStore.bookFiles.set(bookId, newFile);
    memoryStore.processingJobs.set(bookId, newJob);
    memoryStore.progress.set(`${userId}:${bookId}`, initialProgress);
  }

  return {
    book: newBook,
    file: newFile,
    job: newJob,
  };
}

export async function getBookFile(bookId: string, userId: string): Promise<BookFile | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .select({
        file: bookFilesTable,
        book: booksTable,
      })
      .from(bookFilesTable)
      .innerJoin(booksTable, eq(bookFilesTable.bookId, booksTable.id))
      .where(
        and(
          eq(bookFilesTable.bookId, bookId),
          eq(booksTable.userId, userId),
          isNull(booksTable.deletedAt),
        ),
      )
      .limit(1);

    return res[0]?.file || null;
  }

  const book = memoryStore.books.get(bookId);
  if (!book || book.userId !== userId || book.deletedAt) {
    return null;
  }
  return memoryStore.bookFiles.get(bookId) || null;
}

export async function getBookById(bookId: string): Promise<Book | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), isNull(booksTable.deletedAt)))
      .limit(1);
    return res[0] || null;
  }
  const book = memoryStore.books.get(bookId);
  if (!book || book.deletedAt) return null;
  return book;
}


export async function getBookFileByBookId(bookId: string): Promise<BookFile | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .select()
      .from(bookFilesTable)
      .where(eq(bookFilesTable.bookId, bookId))
      .limit(1);
    return res[0] || null;
  }
  return memoryStore.bookFiles.get(bookId) || null;
}

export async function getBookProcessingStatus(
  bookId: string,
  userId: string,
  jobId?: string,
): Promise<{
  id?: string;
  bookId?: string;
  jobType?: string;
  status: string;
  bookStatus?: string;
  stage: string;
  progress: number;
  processedPages: number;
  totalPages: number;
  summary?: any;
  errorCode?: string | null;
  errorMessage?: string | null;
} | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const book = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);
    if (!book[0]) return null;

    const conditions = [eq(processingJobsTable.bookId, bookId)];
    if (jobId) {
      conditions.push(eq(processingJobsTable.id, jobId));
    } else {
      conditions.push(eq(processingJobsTable.jobType, "pdf_processing"));
    }

    const job = await db
      .select()
      .from(processingJobsTable)
      .where(and(...conditions))
      .orderBy(desc(processingJobsTable.createdAt), desc(processingJobsTable.updatedAt))
      .limit(1);

    const activeJob = job[0];

    return {
      id: activeJob?.id,
      bookId,
      jobType: activeJob?.jobType ?? "pdf_processing",
      status: activeJob?.status ?? "pending",
      bookStatus: book[0].processingStatus,
      stage: activeJob?.stage ?? (book[0].processingStatus === "ready" ? "completed" : "ready"),
      progress: activeJob?.progressPercent ?? (activeJob?.status === "completed" ? 100 : 0),
      processedPages: activeJob?.processedPages ?? (activeJob?.status === "completed" ? book[0].totalPages : 0),
      totalPages: activeJob?.totalPages || book[0].totalPages,
      summary: activeJob?.summary || null,
      errorCode: activeJob?.errorCode || null,
      errorMessage: activeJob?.errorMessageSafe || activeJob?.errorMessage || null,
    };
  }

  const book = memoryStore.books.get(bookId);
  if (!book || book.userId !== userId || book.deletedAt) return null;

  const jobs = Array.from(memoryStore.processingJobs.values()).filter(
    (j) => j.bookId === bookId && (jobId ? j.id === jobId : j.jobType === "pdf_processing"),
  );
  jobs.sort((a, b) => {
    const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  const job = jobs[0];

  return {
    id: job?.id,
    bookId,
    jobType: job?.jobType ?? "pdf_processing",
    status: job?.status ?? "pending",
    bookStatus: book.processingStatus,
    stage: job?.stage ?? (book.processingStatus === "ready" ? "completed" : "ready"),
    progress: job?.progressPercent ?? (job?.status === "completed" ? 100 : 0),
    processedPages: job?.processedPages ?? (job?.status === "completed" ? book.totalPages : 0),
    totalPages: job?.totalPages || book.totalPages,
    summary: job?.summary || null,
    errorCode: job?.errorCode || null,
    errorMessage: job?.errorMessageSafe || job?.errorMessage || null,
  };
}

export async function getProcessingJobById(jobId: string): Promise<ProcessingJob | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .select()
      .from(processingJobsTable)
      .where(eq(processingJobsTable.id, jobId))
      .limit(1);
    return res[0] || null;
  }
  return memoryStore.processingJobs.get(jobId) || null;
}

export async function getLatestProcessingJob(
  bookId: string,
  jobType?: string,
): Promise<ProcessingJob | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const conditions = [eq(processingJobsTable.bookId, bookId)];
    if (jobType) {
      conditions.push(eq(processingJobsTable.jobType, jobType));
    }
    const res = await db
      .select()
      .from(processingJobsTable)
      .where(and(...conditions))
      .orderBy(desc(processingJobsTable.createdAt), desc(processingJobsTable.updatedAt))
      .limit(1);

    return res[0] || null;
  }

  const jobs = Array.from(memoryStore.processingJobs.values()).filter(
    (j) => j.bookId === bookId && (!jobType || j.jobType === jobType),
  );
  jobs.sort((a, b) => {
    const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  return jobs[0] || null;
}

export async function createProcessingJob(data: {
  id?: string;
  bookId: string;
  jobType: string;
  status?: string;
  stage?: string;
  progressPercent?: number;
  attempt?: number;
  processedPages?: number;
  totalPages?: number;
  errorCode?: string | null;
  errorMessageSafe?: string | null;
  errorMessage?: string | null;
  summary?: any;
}): Promise<ProcessingJob> {
  const db = getDb();
  const now = new Date();
  const id = data.id || crypto.randomUUID();

  const newJob: ProcessingJob = {
    id,
    bookId: data.bookId,
    jobType: data.jobType,
    status: data.status || "pending",
    stage: data.stage || "pending",
    progressPercent: data.progressPercent ?? 0,
    attempt: data.attempt ?? 1,
    processedPages: data.processedPages ?? 0,
    totalPages: data.totalPages ?? 0,
    errorCode: data.errorCode || null,
    errorMessageSafe: data.errorMessageSafe || null,
    errorMessage: data.errorMessage || null,
    summary: data.summary || null,
    createdAt: now,
    updatedAt: now,
  };

  if (db && (await checkDatabaseHealth())) {
    await db.insert(processingJobsTable).values(newJob);
    return newJob;
  }

  memoryStore.processingJobs.set(id, newJob);
  return newJob;
}

export async function updateProcessingJob(
  jobId: string,
  updates: Partial<ProcessingJob>,
): Promise<ProcessingJob | null> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .update(processingJobsTable)
      .set({ ...updates, updatedAt: now })
      .where(eq(processingJobsTable.id, jobId))
      .returning();
    return res[0] || null;
  }

  const existing = memoryStore.processingJobs.get(jobId);
  if (!existing) return null;
  const updated: ProcessingJob = {
    ...existing,
    ...updates,
    updatedAt: now,
  };
  memoryStore.processingJobs.set(jobId, updated);
  return updated;
}

export async function saveBookPagesBatch(
  bookId: string,
  pages: Array<{
    pageNumber: number;
    pageType?: string;
    rawText?: string;
    normalizedText?: string;
    textContent?: string;
    textSource?: string;
    characterCount?: number;
    wordCount?: number;
    ocrRequired?: boolean;
    ocrStatus?: string;
    ocrConfidence?: number | null;
    qualityScore?: number;
    width?: number | null;
    height?: number | null;
    rotation?: number;
    previewPath?: string | null;
    textBlocks?: any;
    parserVersion?: string | null;
    ocrVersion?: string | null;
    isBlank?: boolean;
    processedAt?: Date | null;
  }>,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  const pagesToInsert: BookPage[] = pages.map((p) => ({
    id: crypto.randomUUID(),
    bookId,
    pageNumber: p.pageNumber,
    pageType: p.pageType || "digital",
    rawText: p.rawText || "",
    normalizedText: p.normalizedText || "",
    textContent: p.textContent || p.normalizedText || "",
    textSource: p.textSource || "native",
    characterCount: p.characterCount ?? (p.normalizedText || "").length,
    wordCount: p.wordCount ?? 0,
    ocrRequired: p.ocrRequired ?? false,
    ocrStatus: p.ocrStatus ?? "not_required",
    ocrConfidence: p.ocrConfidence ?? null,
    qualityScore: p.qualityScore ?? 100,
    width: p.width ?? null,
    height: p.height ?? null,
    rotation: p.rotation ?? 0,
    previewPath: p.previewPath ?? null,
    textBlocks: p.textBlocks || [],
    parserVersion: p.parserVersion || null,
    ocrVersion: p.ocrVersion || null,
    isBlank: p.isBlank ?? false,
    contentHash: (p as any).contentHash ?? null,
    processedAt: p.processedAt || now,
    createdAt: now,
    updatedAt: now,
  }));

  if (db && (await checkDatabaseHealth())) {
    for (const page of pagesToInsert) {
      await db
        .insert(bookPagesTable)
        .values(page)
        .onConflictDoUpdate({
          target: [bookPagesTable.bookId, bookPagesTable.pageNumber],
          set: {
            pageType: page.pageType,
            rawText: page.rawText,
            normalizedText: page.normalizedText,
            textContent: page.textContent,
            textSource: page.textSource,
            characterCount: page.characterCount,
            wordCount: page.wordCount,
            ocrRequired: page.ocrRequired,
            ocrStatus: page.ocrStatus,
            ocrConfidence: page.ocrConfidence,
            qualityScore: page.qualityScore,
            width: page.width,
            height: page.height,
            rotation: page.rotation,
            previewPath: page.previewPath,
            textBlocks: page.textBlocks,
            parserVersion: page.parserVersion,
            ocrVersion: page.ocrVersion,
            isBlank: page.isBlank,
            processedAt: page.processedAt,
            updatedAt: page.updatedAt,
          },
        });
    }
    return;
  }

  // Memory fallback
  let existingPages = memoryStore.pages.get(bookId) || [];
  for (const page of pagesToInsert) {
    const idx = existingPages.findIndex((ep) => ep.pageNumber === page.pageNumber);
    if (idx >= 0) {
      existingPages[idx] = { ...existingPages[idx], ...page, updatedAt: now };
    } else {
      existingPages.push(page);
    }
  }
  existingPages.sort((a, b) => a.pageNumber - b.pageNumber);
  memoryStore.pages.set(bookId, existingPages);
}

export async function getBookPages(
  bookId: string,
  userId: string,
  options?: { page?: number; limit?: number },
): Promise<{
  pages: Array<Omit<BookPage, "rawText" | "normalizedText" | "textContent" | "textBlocks">>;
  total: number;
} | null> {
  const db = getDb();
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const offset = (page - 1) * limit;

  if (db && (await checkDatabaseHealth())) {
    const book = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);
    if (!book[0]) return null;

    const totalRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookPagesTable)
      .where(eq(bookPagesTable.bookId, bookId));
    const total = Number(totalRes[0]?.count ?? 0);

    const pages = await db
      .select({
        id: bookPagesTable.id,
        bookId: bookPagesTable.bookId,
        pageNumber: bookPagesTable.pageNumber,
        pageType: bookPagesTable.pageType,
        textSource: bookPagesTable.textSource,
        characterCount: bookPagesTable.characterCount,
        wordCount: bookPagesTable.wordCount,
        ocrRequired: bookPagesTable.ocrRequired,
        ocrStatus: bookPagesTable.ocrStatus,
        ocrConfidence: bookPagesTable.ocrConfidence,
        qualityScore: bookPagesTable.qualityScore,
        width: bookPagesTable.width,
        height: bookPagesTable.height,
        rotation: bookPagesTable.rotation,
        previewPath: bookPagesTable.previewPath,
        parserVersion: bookPagesTable.parserVersion,
        ocrVersion: bookPagesTable.ocrVersion,
        isBlank: bookPagesTable.isBlank,
        contentHash: bookPagesTable.contentHash,
        processedAt: bookPagesTable.processedAt,
        createdAt: bookPagesTable.createdAt,
        updatedAt: bookPagesTable.updatedAt,
      })
      .from(bookPagesTable)
      .where(eq(bookPagesTable.bookId, bookId))
      .orderBy(bookPagesTable.pageNumber)
      .limit(limit)
      .offset(offset);

    return { pages, total };
  }

  const book = memoryStore.books.get(bookId);
  if (!book || book.userId !== userId || book.deletedAt) return null;

  const allPages = memoryStore.pages.get(bookId) || [];
  const total = allPages.length;
  const pages = allPages.slice(offset, offset + limit).map((p) => {
    const { rawText, normalizedText, textContent, textBlocks, ...meta } = p;
    return meta;
  });

  return { pages, total };
}

export async function getBookPage(
  bookId: string,
  pageNumber: number,
  userId: string,
): Promise<BookPage | null> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const book = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);
    if (!book[0]) return null;

    const res = await db
      .select()
      .from(bookPagesTable)
      .where(and(eq(bookPagesTable.bookId, bookId), eq(bookPagesTable.pageNumber, pageNumber)))
      .limit(1);

    return res[0] || null;
  }

  const book = memoryStore.books.get(bookId);
  if (!book || book.userId !== userId || book.deletedAt) return null;

  const pages = memoryStore.pages.get(bookId) || [];
  return pages.find((p) => p.pageNumber === pageNumber) || null;
}

export async function updateBookStatus(
  bookId: string,
  status: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  if (db && (await checkDatabaseHealth())) {
    await db.update(booksTable).set({ processingStatus: status, updatedAt: now }).where(eq(booksTable.id, bookId));
    return;
  }
  const b = memoryStore.books.get(bookId);
  if (b) {
    b.processingStatus = status;
    b.updatedAt = now;
  }
}

export async function deleteBook(
  bookId: string,
  userId: string,
): Promise<{ success: boolean; filePath?: string }> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const bookRes = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)))
      .limit(1);
    if (!bookRes[0]) return { success: false };

    const fileRes = await db
      .select()
      .from(bookFilesTable)
      .where(eq(bookFilesTable.bookId, bookId))
      .limit(1);

    const filePath = fileRes[0]?.filePath;

    // Hard delete cascading
    await db.delete(booksTable).where(eq(booksTable.id, bookId));

    return { success: true, filePath };
  }

  // Memory fallback
  const book = memoryStore.books.get(bookId);
  if (!book || book.userId !== userId) {
    return { success: false };
  }

  const file = memoryStore.bookFiles.get(bookId);
  const filePath = file?.filePath;

  memoryStore.books.delete(bookId);
  memoryStore.bookFiles.delete(bookId);
  memoryStore.processingJobs.delete(bookId);
  memoryStore.progress.delete(`${userId}:${bookId}`);
  memoryStore.pages.delete(bookId);

  for (const [id, h] of memoryStore.highlights.entries()) {
    if (h.bookId === bookId) memoryStore.highlights.delete(id);
  }
  for (const [id, n] of memoryStore.notes.entries()) {
    if (n.bookId === bookId) memoryStore.notes.delete(id);
  }
  for (const [id, s] of memoryStore.separators.entries()) {
    if (s.bookId === bookId) memoryStore.separators.delete(id);
  }
  for (const [id, bm] of memoryStore.bookmarks.entries()) {
    if (bm.bookId === bookId) memoryStore.bookmarks.delete(id);
  }

  return { success: true, filePath };
}

// Reading progress, bookmarks, notes handlers
export async function updateReadingProgress(
  bookId: string,
  userId: string,
  data: { currentPage: number; progressPercent?: number; completed?: boolean },
): Promise<ReadingProgress | null> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const bookRes = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);

    if (!bookRes[0]) return null;
    const b = bookRes[0];
    const safePage = Math.max(1, Math.min(b.totalPages, data.currentPage));
    const percent = data.progressPercent ?? Math.round((safePage / (b.totalPages || 1)) * 100);

    const existing = await db
      .select()
      .from(readingProgressTable)
      .where(and(eq(readingProgressTable.userId, userId), eq(readingProgressTable.bookId, bookId)))
      .limit(1);

    // Section 26: do NOT automatically mark completed on last page
    const completed = data.completed !== undefined ? data.completed : (existing[0]?.completed ?? false);

    if (existing[0]) {
      const updated: ReadingProgress = {
        ...existing[0],
        currentPage: safePage,
        progressPercent: percent,
        completed,
        lastReadAt: now,
        updatedAt: now,
      };
      await db
        .update(readingProgressTable)
        .set(updated)
        .where(eq(readingProgressTable.id, existing[0].id));
      await db
        .update(booksTable)
        .set({ currentPage: safePage, updatedAt: now })
        .where(eq(booksTable.id, bookId));
      return updated;
    } else {
      const created: ReadingProgress = {
        id: crypto.randomUUID(),
        userId,
        bookId,
        currentPage: safePage,
        progressPercent: percent,
        completed,
        lastReadAt: now,
        updatedAt: now,
      };
      await db.insert(readingProgressTable).values(created);
      await db
        .update(booksTable)
        .set({ currentPage: safePage, updatedAt: now })
        .where(eq(booksTable.id, bookId));
      return created;
    }
  }

  // Memory fallback
  const b = memoryStore.books.get(bookId);
  if (!b || b.userId !== userId || b.deletedAt) return null;

  const safePage = Math.max(1, Math.min(b.totalPages, data.currentPage));
  const percent = data.progressPercent ?? Math.round((safePage / (b.totalPages || 1)) * 100);
  let progress = memoryStore.progress.get(`${userId}:${bookId}`);
  const completed = data.completed !== undefined ? data.completed : (progress?.completed ?? false);

  b.currentPage = safePage;
  b.updatedAt = now;

  if (progress) {
    progress.currentPage = safePage;
    progress.progressPercent = percent;
    progress.completed = completed;
    progress.lastReadAt = now;
    progress.updatedAt = now;
  } else {
    progress = {
      id: crypto.randomUUID(),
      userId,
      bookId,
      currentPage: safePage,
      progressPercent: percent,
      completed,
      lastReadAt: now,
      updatedAt: now,
    };
    memoryStore.progress.set(`${userId}:${bookId}`, progress);
  }

  return progress;
}

// ---------------------------------------------------------------------------
// BM-PRD-06: Bookmarks Management
// ---------------------------------------------------------------------------

export async function getBookBookmarks(
  bookId: string,
  userId: string,
): Promise<Bookmark[]> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    return await db
      .select()
      .from(bookmarksTable)
      .where(
        and(
          eq(bookmarksTable.bookId, bookId),
          eq(bookmarksTable.userId, userId),
        ),
      )
      .orderBy(bookmarksTable.pageNumber, bookmarksTable.createdAt);
  }

  const list: Bookmark[] = [];
  for (const bm of memoryStore.bookmarks.values()) {
    if (bm.bookId === bookId && bm.userId === userId) {
      list.push(bm);
    }
  }
  return list.sort((a, b) => a.pageNumber - b.pageNumber);
}

export async function createBookmark(
  bookId: string,
  userId: string,
  data: { pageNumber: number; title?: string },
): Promise<Bookmark | null> {
  const db = getDb();
  const now = new Date();
  const id = crypto.randomUUID();

  if (db && (await checkDatabaseHealth())) {
    const book = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);
    if (!book[0]) return null;

    const bookmark: Bookmark = {
      id,
      userId,
      bookId,
      pageNumber: data.pageNumber,
      title: data.title || null,
      createdAt: now,
    };
    await db.insert(bookmarksTable).values(bookmark);
    return bookmark;
  }

  // Memory fallback
  const b = memoryStore.books.get(bookId);
  if (!b || b.userId !== userId || b.deletedAt) return null;

  const bookmark: Bookmark = {
    id,
    userId,
    bookId,
    pageNumber: data.pageNumber,
    title: data.title || null,
    createdAt: now,
  };
  memoryStore.bookmarks.set(id, bookmark);
  return bookmark;
}

export async function deleteBookmark(
  bookmarkId: string,
  bookId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    await db
      .delete(bookmarksTable)
      .where(
        and(
          eq(bookmarksTable.id, bookmarkId),
          eq(bookmarksTable.bookId, bookId),
          eq(bookmarksTable.userId, userId),
        ),
      );
    return true;
  }

  const bm = memoryStore.bookmarks.get(bookmarkId);
  if (bm && bm.userId === userId && bm.bookId === bookId) {
    memoryStore.bookmarks.delete(bookmarkId);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// BM-PRD-06: Notes & Global Notes Management
// ---------------------------------------------------------------------------

export async function getBookNotes(
  bookId: string,
  userId: string,
  pageNumber?: number,
): Promise<Note[]> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const conditions = [
      eq(notesTable.bookId, bookId),
      eq(notesTable.userId, userId),
      isNull(notesTable.deletedAt),
    ];
    if (pageNumber !== undefined) {
      conditions.push(eq(notesTable.pageNumber, pageNumber));
    }
    return await db
      .select()
      .from(notesTable)
      .where(and(...conditions))
      .orderBy(notesTable.pageNumber, desc(notesTable.createdAt));
  }

  const list: Note[] = [];
  for (const n of memoryStore.notes.values()) {
    if (
      n.bookId === bookId &&
      n.userId === userId &&
      !n.deletedAt &&
      (pageNumber === undefined || n.pageNumber === pageNumber)
    ) {
      list.push(n);
    }
  }
  return list.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export async function getGlobalNotes(
  userId: string,
  options: {
    bookId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{
  notes: Array<{
    id: string;
    userId: string;
    bookId: string;
    bookTitle: string;
    pageNumber: number;
    highlightId: string | null;
    selectedText: string | null;
    content: string;
    color: string;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  limit: number;
}> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const conditions = [
      eq(notesTable.userId, userId),
      isNull(notesTable.deletedAt),
      isNull(booksTable.deletedAt),
    ];
    if (options.bookId) {
      conditions.push(eq(notesTable.bookId, options.bookId));
    }
    if (options.search) {
      const q = `%${options.search}%`;
      conditions.push(
        sql`(${notesTable.content} ILIKE ${q} OR ${notesTable.selectedText} ILIKE ${q} OR ${notesTable.highlightText} ILIKE ${q})`,
      );
    }

    const baseQuery = db
      .select({
        id: notesTable.id,
        userId: notesTable.userId,
        bookId: notesTable.bookId,
        bookTitle: booksTable.title,
        pageNumber: notesTable.pageNumber,
        highlightId: notesTable.highlightId,
        selectedText: notesTable.selectedText,
        content: notesTable.content,
        color: notesTable.color,
        createdAt: notesTable.createdAt,
        updatedAt: notesTable.updatedAt,
      })
      .from(notesTable)
      .innerJoin(booksTable, eq(notesTable.bookId, booksTable.id))
      .where(and(...conditions))
      .orderBy(desc(notesTable.updatedAt));

    const totalRes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notesTable)
      .innerJoin(booksTable, eq(notesTable.bookId, booksTable.id))
      .where(and(...conditions));
    const total = totalRes[0]?.count || 0;

    const rows = await baseQuery.limit(limit).offset(offset);
    return {
      notes: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  // Memory fallback
  let all: Array<{
    id: string;
    userId: string;
    bookId: string;
    bookTitle: string;
    pageNumber: number;
    highlightId: string | null;
    selectedText: string | null;
    content: string;
    color: string;
    createdAt: string;
    updatedAt: string;
    rawUpdatedAt: Date;
  }> = [];

  for (const n of memoryStore.notes.values()) {
    if (n.userId !== userId || n.deletedAt) continue;
    if (options.bookId && n.bookId !== options.bookId) continue;

    const b = memoryStore.books.get(n.bookId);
    if (!b || b.deletedAt) continue;

    if (options.search) {
      const q = options.search.toLowerCase();
      const match =
        n.content.toLowerCase().includes(q) ||
        (n.selectedText && n.selectedText.toLowerCase().includes(q)) ||
        (n.highlightText && n.highlightText.toLowerCase().includes(q));
      if (!match) continue;
    }

    all.push({
      id: n.id,
      userId: n.userId,
      bookId: n.bookId,
      bookTitle: b.title,
      pageNumber: n.pageNumber,
      highlightId: n.highlightId || null,
      selectedText: n.selectedText || null,
      content: n.content,
      color: n.color,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
      rawUpdatedAt: n.updatedAt,
    });
  }

  all.sort((a, b) => b.rawUpdatedAt.getTime() - a.rawUpdatedAt.getTime());
  const total = all.length;
  const paged = all.slice(offset, offset + limit).map(({ rawUpdatedAt, ...rest }) => rest);

  return { notes: paged, total, page, limit };
}

export async function createNote(
  bookId: string,
  userId: string,
  data: {
    pageNumber: number;
    content: string;
    highlightId?: string | null;
    highlightText?: string | null;
    selectedText?: string | null;
    anchorData?: any | null;
    color?: string;
  },
): Promise<Note | null> {
  const db = getDb();
  const now = new Date();
  const id = crypto.randomUUID();

  if (db && (await checkDatabaseHealth())) {
    const book = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);
    if (!book[0]) return null;

    const note: Note = {
      id,
      userId,
      bookId,
      pageNumber: data.pageNumber,
      highlightId: data.highlightId || null,
      selectedText: data.selectedText || data.highlightText || null,
      anchorData: data.anchorData || null,
      content: data.content,
      highlightText: data.highlightText || data.selectedText || null,
      color: data.color || "amber",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(notesTable).values(note);
    return note;
  }

  // Memory fallback
  const b = memoryStore.books.get(bookId);
  if (!b || b.userId !== userId || b.deletedAt) return null;

  const note: Note = {
    id,
    userId,
    bookId,
    pageNumber: data.pageNumber,
    highlightId: data.highlightId || null,
    selectedText: data.selectedText || data.highlightText || null,
    anchorData: data.anchorData || null,
    content: data.content,
    highlightText: data.highlightText || data.selectedText || null,
    color: data.color || "amber",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  memoryStore.notes.set(id, note);
  return note;
}

export async function updateNote(
  noteId: string,
  bookId: string,
  userId: string,
  data: { content: string; color?: string },
): Promise<Note | null> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const existing = await db
      .select()
      .from(notesTable)
      .where(
        and(
          eq(notesTable.id, noteId),
          eq(notesTable.bookId, bookId),
          eq(notesTable.userId, userId),
          isNull(notesTable.deletedAt),
        ),
      )
      .limit(1);
    if (!existing[0]) return null;

    const updated: Note = {
      ...existing[0],
      content: data.content,
      color: data.color || existing[0].color,
      updatedAt: now,
    };
    await db.update(notesTable).set(updated).where(eq(notesTable.id, noteId));
    return updated;
  }

  // Memory fallback
  const note = memoryStore.notes.get(noteId);
  if (!note || note.userId !== userId || note.bookId !== bookId || note.deletedAt) {
    return null;
  }
  note.content = data.content;
  if (data.color) note.color = data.color;
  note.updatedAt = now;
  return note;
}

export async function deleteNote(
  noteId: string,
  bookId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    await db
      .update(notesTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(notesTable.id, noteId),
          eq(notesTable.bookId, bookId),
          eq(notesTable.userId, userId),
          isNull(notesTable.deletedAt),
        ),
      );
    return true;
  }

  const note = memoryStore.notes.get(noteId);
  if (note && note.userId === userId && note.bookId === bookId && !note.deletedAt) {
    note.deletedAt = now;
    note.updatedAt = now;
    return true;
  }
  return false;
}

export async function restoreNote(
  noteId: string,
  bookId: string,
  userId: string,
): Promise<Note | null> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .update(notesTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(
        and(
          eq(notesTable.id, noteId),
          eq(notesTable.bookId, bookId),
          eq(notesTable.userId, userId),
        ),
      )
      .returning();
    return res[0] || null;
  }

  const note = memoryStore.notes.get(noteId);
  if (note && note.userId === userId && note.bookId === bookId) {
    note.deletedAt = null;
    note.updatedAt = now;
    return note;
  }
  return null;
}

// ---------------------------------------------------------------------------
// BM-PRD-06: Highlights & Stable Text Anchoring Management
// ---------------------------------------------------------------------------

export async function getBookHighlights(
  bookId: string,
  userId: string,
  pageNumber?: number,
): Promise<Array<Highlight & { noteCount: number }>> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    const conditions = [
      eq(highlightsTable.bookId, bookId),
      eq(highlightsTable.userId, userId),
      isNull(highlightsTable.deletedAt),
    ];
    if (pageNumber !== undefined) {
      conditions.push(eq(highlightsTable.pageNumber, pageNumber));
    }

    const highlights = await db
      .select()
      .from(highlightsTable)
      .where(and(...conditions))
      .orderBy(highlightsTable.pageNumber, highlightsTable.createdAt);

    if (highlights.length === 0) return [];

    const hIds = highlights.map((h) => h.id);
    const activeNotes = await db
      .select({ highlightId: notesTable.highlightId })
      .from(notesTable)
      .where(and(inArray(notesTable.highlightId, hIds), isNull(notesTable.deletedAt)));

    const countMap = new Map<string, number>();
    for (const an of activeNotes) {
      if (an.highlightId) {
        countMap.set(an.highlightId, (countMap.get(an.highlightId) || 0) + 1);
      }
    }

    return highlights.map((h) => ({
      ...h,
      noteCount: countMap.get(h.id) || 0,
    }));
  }

  // Memory fallback
  const list: Array<Highlight & { noteCount: number }> = [];
  for (const h of memoryStore.highlights.values()) {
    if (
      h.bookId === bookId &&
      h.userId === userId &&
      !h.deletedAt &&
      (pageNumber === undefined || h.pageNumber === pageNumber)
    ) {
      let ncount = 0;
      for (const n of memoryStore.notes.values()) {
        if (n.highlightId === h.id && !n.deletedAt) {
          ncount++;
        }
      }
      list.push({ ...h, noteCount: ncount });
    }
  }

  return list.sort((a, b) => {
    if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export async function createHighlight(
  bookId: string,
  userId: string,
  data: {
    pageNumber: number;
    startBlockId: string;
    startOffset: number;
    endBlockId: string;
    endOffset: number;
    exactText: string;
    prefixText?: string | null;
    suffixText?: string | null;
    color?: string;
    category?: string | null;
    boundingBoxes?: any[] | null;
  },
): Promise<Highlight | null> {
  const book = await getBookById(bookId);
  if (!book || book.userId !== userId || book.deletedAt) {
    return null;
  }

  const db = getDb();
  const now = new Date();
  const id = crypto.randomUUID();
  const textHash = computeTextHash(data.exactText);

  const highlight: Highlight = {
    id,
    userId,
    bookId,
    pageNumber: data.pageNumber,
    anchorVersion: 1,
    startBlockId: data.startBlockId,
    startOffset: data.startOffset,
    endBlockId: data.endBlockId,
    endOffset: data.endOffset,
    exactText: data.exactText,
    prefixText: data.prefixText || null,
    suffixText: data.suffixText || null,
    textHash,
    color: (data.color as any) || "yellow",
    category: (data.category as any) || null,
    anchorStatus: "resolved",
    boundingBoxes: data.boundingBoxes || null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  if (db && (await checkDatabaseHealth())) {
    const book = await db
      .select()
      .from(booksTable)
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId), isNull(booksTable.deletedAt)))
      .limit(1);
    if (!book[0]) return null;

    await db.insert(highlightsTable).values(highlight);
    return highlight;
  }

  // Memory fallback
  const b = memoryStore.books.get(bookId);
  if (!b || b.userId !== userId || b.deletedAt) return null;

  memoryStore.highlights.set(id, highlight);
  return highlight;
}

export async function updateHighlight(
  highlightId: string,
  bookId: string,
  userId: string,
  data: {
    color?: string;
    category?: string | null;
  },
): Promise<Highlight | null> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const existing = await db
      .select()
      .from(highlightsTable)
      .where(
        and(
          eq(highlightsTable.id, highlightId),
          eq(highlightsTable.bookId, bookId),
          eq(highlightsTable.userId, userId),
          isNull(highlightsTable.deletedAt),
        ),
      )
      .limit(1);
    if (!existing[0]) return null;

    const updatePayload: Partial<Highlight> = {
      updatedAt: now,
    };
    if (data.color !== undefined) updatePayload.color = data.color as any;
    if (data.category !== undefined) updatePayload.category = data.category as any;

    const updated: Highlight = {
      ...existing[0],
      ...updatePayload,
    };
    await db
      .update(highlightsTable)
      .set(updatePayload)
      .where(eq(highlightsTable.id, highlightId));
    return updated;
  }

  // Memory fallback
  const h = memoryStore.highlights.get(highlightId);
  if (!h || h.userId !== userId || h.bookId !== bookId || h.deletedAt) {
    return null;
  }
  if (data.color !== undefined) h.color = data.color as any;
  if (data.category !== undefined) h.category = data.category as any;
  h.updatedAt = now;
  return h;
}

export async function deleteHighlight(
  highlightId: string,
  bookId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    await db
      .update(highlightsTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(highlightsTable.id, highlightId),
          eq(highlightsTable.bookId, bookId),
          eq(highlightsTable.userId, userId),
          isNull(highlightsTable.deletedAt),
        ),
      );
    return true;
  }

  const h = memoryStore.highlights.get(highlightId);
  if (h && h.userId === userId && h.bookId === bookId && !h.deletedAt) {
    h.deletedAt = now;
    h.updatedAt = now;
    return true;
  }
  return false;
}

export async function restoreHighlight(
  highlightId: string,
  bookId: string,
  userId: string,
): Promise<Highlight | null> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const res = await db
      .update(highlightsTable)
      .set({ deletedAt: null, updatedAt: now })
      .where(
        and(
          eq(highlightsTable.id, highlightId),
          eq(highlightsTable.bookId, bookId),
          eq(highlightsTable.userId, userId),
        ),
      )
      .returning();
    return res[0] || null;
  }

  const h = memoryStore.highlights.get(highlightId);
  if (h && h.userId === userId && h.bookId === bookId) {
    h.deletedAt = null;
    h.updatedAt = now;
    return h;
  }
  return null;
}

// ---------------------------------------------------------------------------
// BM-PRD-06: Separators (Custom Reading Ranges) Management
// ---------------------------------------------------------------------------

export async function getBookSeparators(
  bookId: string,
  userId: string,
): Promise<Separator[]> {
  const db = getDb();
  if (db && (await checkDatabaseHealth())) {
    return await db
      .select()
      .from(separatorsTable)
      .where(
        and(
          eq(separatorsTable.bookId, bookId),
          eq(separatorsTable.userId, userId),
          isNull(separatorsTable.deletedAt),
        ),
      )
      .orderBy(separatorsTable.startPage, separatorsTable.createdAt);
  }

  const list: Separator[] = [];
  for (const s of memoryStore.separators.values()) {
    if (s.bookId === bookId && s.userId === userId && !s.deletedAt) {
      list.push(s);
    }
  }
  return list.sort((a, b) => a.startPage - b.startPage);
}

export async function createSeparator(
  bookId: string,
  userId: string,
  data: {
    title: string;
    startPage: number;
    endPage: number;
    color?: string;
  },
): Promise<Separator | null> {
  const book = await getBookById(bookId);
  if (!book || book.userId !== userId || book.deletedAt) {
    return null;
  }

  if (
    data.startPage < 1 ||
    data.startPage > data.endPage ||
    data.endPage > (book.totalPages || 1)
  ) {
    throw new Error(
      `Invalid separator page range: ${data.startPage}-${data.endPage}. Book has ${book.totalPages} pages.`,
    );
  }

  const db = getDb();
  const now = new Date();
  const id = crypto.randomUUID();

  const separator: Separator = {
    id,
    userId,
    bookId,
    title: data.title.trim(),
    startPage: data.startPage,
    endPage: data.endPage,
    color: data.color || "indigo",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  if (db && (await checkDatabaseHealth())) {
    await db.insert(separatorsTable).values(separator);
    return separator;
  }

  // Memory fallback
  memoryStore.separators.set(id, separator);
  return separator;
}

export async function updateSeparator(
  id: string,
  bookId: string,
  userId: string,
  data: {
    title?: string;
    startPage?: number;
    endPage?: number;
    color?: string;
  },
): Promise<Separator | null> {
  const book = await getBookById(bookId);
  if (!book || book.userId !== userId || book.deletedAt) {
    return null;
  }

  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const existing = await db
      .select()
      .from(separatorsTable)
      .where(
        and(
          eq(separatorsTable.id, id),
          eq(separatorsTable.bookId, bookId),
          eq(separatorsTable.userId, userId),
          isNull(separatorsTable.deletedAt),
        ),
      )
      .limit(1);
    if (!existing[0]) return null;

    const startPage = data.startPage ?? existing[0].startPage;
    const endPage = data.endPage ?? existing[0].endPage;

    if (startPage < 1 || startPage > endPage || endPage > (book.totalPages || 1)) {
      throw new Error(
        `Invalid separator page range: ${startPage}-${endPage}. Book has ${book.totalPages} pages.`,
      );
    }

    const updated: Separator = {
      ...existing[0],
      title: data.title ? data.title.trim() : existing[0].title,
      startPage,
      endPage,
      color: data.color || existing[0].color,
      updatedAt: now,
    };

    await db.update(separatorsTable).set(updated).where(eq(separatorsTable.id, id));
    return updated;
  }

  // Memory fallback
  const sep = memoryStore.separators.get(id);
  if (!sep || sep.userId !== userId || sep.bookId !== bookId || sep.deletedAt) {
    return null;
  }

  const startPage = data.startPage ?? sep.startPage;
  const endPage = data.endPage ?? sep.endPage;

  if (startPage < 1 || startPage > endPage || endPage > (book.totalPages || 1)) {
    throw new Error(
      `Invalid separator page range: ${startPage}-${endPage}. Book has ${book.totalPages} pages.`,
    );
  }

  if (data.title) sep.title = data.title.trim();
  sep.startPage = startPage;
  sep.endPage = endPage;
  if (data.color) sep.color = data.color;
  sep.updatedAt = now;
  return sep;
}

export async function deleteSeparator(
  id: string,
  bookId: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    await db
      .update(separatorsTable)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(separatorsTable.id, id),
          eq(separatorsTable.bookId, bookId),
          eq(separatorsTable.userId, userId),
          isNull(separatorsTable.deletedAt),
        ),
      );
    return true;
  }

  const sep = memoryStore.separators.get(id);
  if (sep && sep.userId === userId && sep.bookId === bookId && !sep.deletedAt) {
    sep.deletedAt = now;
    sep.updatedAt = now;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// BM-PRD-06: Reprocess Anchor Revalidation Engine
// ---------------------------------------------------------------------------

export async function revalidateHighlightsForBook(bookId: string): Promise<void> {
  const db = getDb();
  const now = new Date();

  if (db && (await checkDatabaseHealth())) {
    const pages = await db
      .select()
      .from(bookPagesTable)
      .where(eq(bookPagesTable.bookId, bookId));

    if (!pages || pages.length === 0) return;

    const pageMap = new Map<number, BookPage>();
    for (const p of pages) {
      pageMap.set(p.pageNumber, p);
    }

    const highlights = await db
      .select()
      .from(highlightsTable)
      .where(and(eq(highlightsTable.bookId, bookId), isNull(highlightsTable.deletedAt)));

    for (const h of highlights) {
      const page = pageMap.get(h.pageNumber);
      const blocks = (page?.textBlocks as any[]) || [];
      if (!page || blocks.length === 0) {
        await db
          .update(highlightsTable)
          .set({ anchorStatus: "needs_review", updatedAt: now })
          .where(eq(highlightsTable.id, h.id));
        continue;
      }

      const formattedBlocks = blocks.map((b: any, idx: number) => ({
        id: b.id || `b-${idx + 1}`,
        text: b.text || "",
        bbox: b.bbox || null,
      }));

      const res = resolveAnchor(formattedBlocks, {
        startBlockId: h.startBlockId,
        startOffset: h.startOffset,
        endBlockId: h.endBlockId,
        endOffset: h.endOffset,
        exactText: h.exactText,
        prefixText: h.prefixText,
        suffixText: h.suffixText,
        textHash: h.textHash,
      });

      await db
        .update(highlightsTable)
        .set({
          anchorStatus: res.status as any,
          startBlockId: res.startBlockId,
          startOffset: res.startOffset,
          endBlockId: res.endBlockId,
          endOffset: res.endOffset,
          updatedAt: now,
        })
        .where(eq(highlightsTable.id, h.id));
    }
    return;
  }

  // Memory fallback
  const pages = memoryStore.pages.get(bookId) || [];
  if (!pages || pages.length === 0) return;

  const pageMap = new Map<number, BookPage>();
  for (const p of pages) {
    pageMap.set(p.pageNumber, p);
  }

  for (const h of memoryStore.highlights.values()) {
    if (h.bookId === bookId && !h.deletedAt) {
      const page = pageMap.get(h.pageNumber);
      const blocks = (page?.textBlocks as any[]) || [];
      if (!page || blocks.length === 0) {
        h.anchorStatus = "needs_review" as any;
        h.updatedAt = now;
        continue;
      }

      const formattedBlocks = blocks.map((b: any, idx: number) => ({
        id: b.id || `b-${idx + 1}`,
        text: b.text || "",
        bbox: b.bbox || null,
      }));

      const res = resolveAnchor(formattedBlocks, {
        startBlockId: h.startBlockId,
        startOffset: h.startOffset,
        endBlockId: h.endBlockId,
        endOffset: h.endOffset,
        exactText: h.exactText,
        prefixText: h.prefixText,
        suffixText: h.suffixText,
        textHash: h.textHash,
      });

      h.anchorStatus = res.status as any;
      h.startBlockId = res.startBlockId;
      h.startOffset = res.startOffset;
      h.endBlockId = res.endBlockId;
      h.endOffset = res.endOffset;
      h.updatedAt = now;
    }
  }
}

// ==========================================
// BM-PRD-07: AI & RAG REPOSITORY OPERATIONS
// ==========================================

export async function getBookPagesForIndexing(bookId: string): Promise<BookPage[]> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const rows = await activeDb
        .select()
        .from(bookPagesTable)
        .where(eq(bookPagesTable.bookId, bookId))
        .orderBy(bookPagesTable.pageNumber);
      return rows;
    } catch {
      // Fall through to memory
    }
  }
  return memoryStore.pages.get(bookId) || [];
}

export async function getBookAiIndex(bookId: string): Promise<BookAiIndex | null> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const rows = await activeDb
        .select()
        .from(bookAiIndexesTable)
        .where(eq(bookAiIndexesTable.bookId, bookId))
        .orderBy(desc(bookAiIndexesTable.createdAt))
        .limit(1);
      return rows[0] || null;
    } catch {
      // Fall through to memory
    }
  }
  return memoryStore.bookAiIndexes.get(bookId) || null;
}

export async function upsertBookAiIndex(
  data: Partial<InsertBookAiIndex> & { bookId: string },
): Promise<BookAiIndex> {
  const activeDb = getDb();
  const now = new Date();

  if (activeDb) {
    try {
      const existing = await activeDb
        .select()
        .from(bookAiIndexesTable)
        .where(eq(bookAiIndexesTable.bookId, data.bookId))
        .limit(1);

      if (existing.length > 0) {
        const [updated] = await activeDb
          .update(bookAiIndexesTable)
          .set({
            ...data,
            updatedAt: now,
          })
          .where(eq(bookAiIndexesTable.id, existing[0].id))
          .returning();
        return updated;
      } else {
        const [created] = await activeDb
          .insert(bookAiIndexesTable)
          .values({
            id: data.id || crypto.randomUUID(),
            bookId: data.bookId,
            status: data.status || "not_indexed",
            indexVersion: data.indexVersion || "bm-rag-v1",
            embeddingModel: data.embeddingModel || "mock-embedding-v1",
            embeddingVersion: data.embeddingVersion || "1.0",
            chunkCount: data.chunkCount ?? 0,
            indexedPageCount: data.indexedPageCount ?? 0,
            startedAt: data.startedAt,
            completedAt: data.completedAt,
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        return created;
      }
    } catch {
      // Fall through to memory
    }
  }

  // Memory fallback
  const existing = memoryStore.bookAiIndexes.get(data.bookId);
  const record: BookAiIndex = {
    id: existing?.id || data.id || crypto.randomUUID(),
    bookId: data.bookId,
    status: data.status || existing?.status || "not_indexed",
    indexVersion: data.indexVersion || existing?.indexVersion || "bm-rag-v1",
    embeddingModel: data.embeddingModel || existing?.embeddingModel || "mock-embedding-v1",
    embeddingVersion: data.embeddingVersion || existing?.embeddingVersion || "1.0",
    chunkCount: data.chunkCount ?? existing?.chunkCount ?? 0,
    indexedPageCount: data.indexedPageCount ?? existing?.indexedPageCount ?? 0,
    startedAt: data.startedAt !== undefined ? (data.startedAt ? new Date(data.startedAt as any) : null) : existing?.startedAt || null,
    completedAt: data.completedAt !== undefined ? (data.completedAt ? new Date(data.completedAt as any) : null) : existing?.completedAt || null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  memoryStore.bookAiIndexes.set(data.bookId, record);
  return record;
}

export async function saveAiChunks(chunks: InsertAiChunk[]): Promise<AiChunk[]> {
  const activeDb = getDb();
  const now = new Date();

  if (activeDb && chunks.length > 0) {
    try {
      const inserted = await activeDb.insert(aiChunksTable).values(chunks).returning();
      return inserted;
    } catch {
      // Fall through to memory
    }
  }

  // Memory fallback
  const results: AiChunk[] = [];
  for (const c of chunks) {
    const chunkRecord: AiChunk = {
      id: c.id || crypto.randomUUID(),
      bookId: c.bookId,
      pageNumber: c.pageNumber,
      chunkIndex: c.chunkIndex,
      text: c.text,
      textHash: c.textHash,
      startBlockId: c.startBlockId,
      startOffset: c.startOffset,
      endBlockId: c.endBlockId,
      endOffset: c.endOffset,
      tokenCount: c.tokenCount ?? 0,
      qualityScore: c.qualityScore ?? 100,
      textSource: c.textSource ?? "extracted",
      embedding: c.embedding ?? null,
      embeddingModel: c.embeddingModel ?? "mock-embedding-v1",
      embeddingVersion: c.embeddingVersion ?? "1.0",
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.aiChunks.set(chunkRecord.id, chunkRecord);
    results.push(chunkRecord);
  }
  return results;
}

export async function getAiChunks(bookId: string, pageNumbers?: number[]): Promise<AiChunk[]> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const query = activeDb.select().from(aiChunksTable).where(eq(aiChunksTable.bookId, bookId));
      const rows = await query;
      if (pageNumbers && pageNumbers.length > 0) {
        return rows.filter((r) => pageNumbers.includes(r.pageNumber));
      }
      return rows;
    } catch {
      // Fall through to memory
    }
  }

  const results: AiChunk[] = [];
  for (const chunk of memoryStore.aiChunks.values()) {
    if (chunk.bookId === bookId) {
      if (!pageNumbers || pageNumbers.includes(chunk.pageNumber)) {
        results.push(chunk);
      }
    }
  }
  return results;
}

export async function deleteAiChunksByBookId(bookId: string): Promise<void> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      await activeDb.delete(aiChunksTable).where(eq(aiChunksTable.bookId, bookId));
    } catch {
      // Fall through
    }
  }
  for (const [id, chunk] of memoryStore.aiChunks.entries()) {
    if (chunk.bookId === bookId) {
      memoryStore.aiChunks.delete(id);
    }
  }
}

export async function createAiConversation(data: InsertAiConversation): Promise<AiConversation> {
  const activeDb = getDb();
  const now = new Date();

  if (activeDb) {
    try {
      const [conv] = await activeDb
        .insert(aiConversationsTable)
        .values({
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      return conv;
    } catch {
      // Fall through
    }
  }

  const conv: AiConversation = {
    id: data.id || crypto.randomUUID(),
    userId: data.userId,
    bookId: data.bookId,
    title: data.title,
    scopeType: data.scopeType || "book",
    scopeRef: data.scopeRef || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
  memoryStore.aiConversations.set(conv.id, conv);
  return conv;
}

export async function getAiConversations(userId: string, bookId: string): Promise<AiConversation[]> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const rows = await activeDb
        .select()
        .from(aiConversationsTable)
        .where(
          and(
            eq(aiConversationsTable.userId, userId),
            eq(aiConversationsTable.bookId, bookId),
            isNull(aiConversationsTable.deletedAt),
          ),
        )
        .orderBy(desc(aiConversationsTable.updatedAt));
      return rows;
    } catch {
      // Fall through
    }
  }

  const results: AiConversation[] = [];
  for (const c of memoryStore.aiConversations.values()) {
    if (c.userId === userId && c.bookId === bookId && !c.deletedAt) {
      results.push(c);
    }
  }
  return results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getAiConversationById(conversationId: string): Promise<AiConversation | null> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const rows = await activeDb
        .select()
        .from(aiConversationsTable)
        .where(
          and(
            eq(aiConversationsTable.id, conversationId),
            isNull(aiConversationsTable.deletedAt),
          ),
        )
        .limit(1);
      return rows[0] || null;
    } catch {
      // Fall through
    }
  }

  const c = memoryStore.aiConversations.get(conversationId);
  if (!c || c.deletedAt) return null;
  return c;
}

export async function deleteAiConversation(conversationId: string): Promise<boolean> {
  const activeDb = getDb();
  const now = new Date();

  if (activeDb) {
    try {
      const res = await activeDb
        .update(aiConversationsTable)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(aiConversationsTable.id, conversationId))
        .returning();
      return res.length > 0;
    } catch {
      // Fall through
    }
  }

  const c = memoryStore.aiConversations.get(conversationId);
  if (!c || c.deletedAt) return false;
  c.deletedAt = now;
  c.updatedAt = now;
  return true;
}

export async function createAiMessage(data: InsertAiMessage): Promise<AiMessage> {
  const activeDb = getDb();
  const now = new Date();

  if (activeDb) {
    try {
      const [msg] = await activeDb
        .insert(aiMessagesTable)
        .values({
          ...data,
          createdAt: now,
        })
        .returning();

      // Update conversation updatedAt
      await activeDb
        .update(aiConversationsTable)
        .set({ updatedAt: now })
        .where(eq(aiConversationsTable.id, data.conversationId));

      return msg;
    } catch {
      // Fall through
    }
  }

  const msg: AiMessage = {
    id: data.id || crypto.randomUUID(),
    conversationId: data.conversationId,
    role: data.role,
    content: data.content,
    model: data.model || null,
    provider: data.provider || null,
    inputTokens: data.inputTokens ?? null,
    outputTokens: data.outputTokens ?? null,
    promptVersion: data.promptVersion || null,
    createdAt: now,
  };
  memoryStore.aiMessages.set(msg.id, msg);

  const conv = memoryStore.aiConversations.get(data.conversationId);
  if (conv) {
    conv.updatedAt = now;
  }

  return msg;
}

export async function getAiMessages(conversationId: string): Promise<AiMessage[]> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const rows = await activeDb
        .select()
        .from(aiMessagesTable)
        .where(eq(aiMessagesTable.conversationId, conversationId))
        .orderBy(aiMessagesTable.createdAt);
      return rows;
    } catch {
      // Fall through
    }
  }

  const results: AiMessage[] = [];
  for (const m of memoryStore.aiMessages.values()) {
    if (m.conversationId === conversationId) {
      results.push(m);
    }
  }
  return results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function createAiMessageSources(
  sources: InsertAiMessageSource[],
): Promise<AiMessageSource[]> {
  const activeDb = getDb();
  if (activeDb && sources.length > 0) {
    try {
      const inserted = await activeDb.insert(aiMessageSourcesTable).values(sources).returning();
      return inserted;
    } catch {
      // Fall through
    }
  }

  const results: AiMessageSource[] = [];
  for (const s of sources) {
    const record: AiMessageSource = {
      id: s.id || crypto.randomUUID(),
      messageId: s.messageId,
      chunkId: s.chunkId || null,
      bookId: s.bookId,
      pageNumber: s.pageNumber,
      quote: s.quote,
      startBlockId: s.startBlockId || null,
      startOffset: s.startOffset ?? null,
      endBlockId: s.endBlockId || null,
      endOffset: s.endOffset ?? null,
      retrievalScore: s.retrievalScore ?? null,
      rank: s.rank ?? 1,
    };
    memoryStore.aiMessageSources.set(record.id, record);
    results.push(record);
  }
  return results;
}

export async function getAiMessageSources(messageId: string): Promise<AiMessageSource[]> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const rows = await activeDb
        .select()
        .from(aiMessageSourcesTable)
        .where(eq(aiMessageSourcesTable.messageId, messageId))
        .orderBy(aiMessageSourcesTable.rank);
      return rows;
    } catch {
      // Fall through
    }
  }

  const results: AiMessageSource[] = [];
  for (const s of memoryStore.aiMessageSources.values()) {
    if (s.messageId === messageId) {
      results.push(s);
    }
  }
  return results.sort((a, b) => a.rank - b.rank);
}

export async function recordAiUsage(data: InsertAiUsage): Promise<AiUsage> {
  const activeDb = getDb();
  const now = new Date();

  if (activeDb) {
    try {
      const [u] = await activeDb
        .insert(aiUsageTable)
        .values({
          ...data,
          createdAt: now,
        })
        .returning();
      return u;
    } catch {
      // Fall through
    }
  }

  const record: AiUsage = {
    id: data.id || crypto.randomUUID(),
    userId: data.userId,
    bookId: data.bookId || null,
    operation: data.operation,
    provider: data.provider || "mock",
    model: data.model,
    inputUnits: data.inputUnits ?? 0,
    outputUnits: data.outputUnits ?? 0,
    durationMs: data.durationMs ?? 0,
    estimatedCost: data.estimatedCost || "0.0000",
    createdAt: now,
  };
  memoryStore.aiUsage.set(record.id, record);
  return record;
}

export async function getAiUsageByUser(userId: string): Promise<AiUsage[]> {
  const activeDb = getDb();
  if (activeDb) {
    try {
      const rows = await activeDb
        .select()
        .from(aiUsageTable)
        .where(eq(aiUsageTable.userId, userId))
        .orderBy(desc(aiUsageTable.createdAt));
      return rows;
    } catch {
      // Fall through
    }
  }

  const results: AiUsage[] = [];
  for (const u of memoryStore.aiUsage.values()) {
    if (u.userId === userId) {
      results.push(u);
    }
  }
  return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// Seed default demo user for frictionless dev and tests
(async () => {
  const demoEmail = "demo@bookmind.app";
  const existing = await findUserByEmail(demoEmail);
  if (!existing) {
    await createUser({
      email: demoEmail,
      passwordHash: hashPassword("bookmind123"),
      displayName: "Lector BookMind",
    });
  }
})().catch(() => {});
