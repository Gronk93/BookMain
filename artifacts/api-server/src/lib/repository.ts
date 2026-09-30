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
  processingJobsTable,
  type User,
  type UserPreferences,
  type Book,
  type BookFile,
  type BookPage,
  type InsertBookPage,
  type ReadingProgress,
  type Bookmark,
  type Note,
  type ProcessingJob,
} from "@workspace/db";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import crypto from "node:crypto";
import { hashPassword } from "./auth";
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
  ProcessingJob,
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
  processingJobs: Map<string, ProcessingJob>; // key: bookId
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
  processingJobs: new Map(),
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
      .where(and(eq(notesTable.userId, userId), eq(notesTable.bookId, bookId)));

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
    if (n.userId === userId && n.bookId === bookId) {
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

export async function createNote(
  bookId: string,
  userId: string,
  data: { pageNumber: number; content: string; highlightText?: string; color?: string },
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
      content: data.content,
      highlightText: data.highlightText || null,
      color: data.color || "amber",
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
    content: data.content,
    highlightText: data.highlightText || null,
    color: data.color || "amber",
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
  if (!note || note.userId !== userId || note.bookId !== bookId) {
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
  if (db && (await checkDatabaseHealth())) {
    await db
      .delete(notesTable)
      .where(
        and(
          eq(notesTable.id, noteId),
          eq(notesTable.bookId, bookId),
          eq(notesTable.userId, userId),
        ),
      );
    return true;
  }

  const note = memoryStore.notes.get(noteId);
  if (note && note.userId === userId && note.bookId === bookId) {
    memoryStore.notes.delete(noteId);
    return true;
  }
  return false;
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
