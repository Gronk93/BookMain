import {
  getDb,
  checkDatabaseHealth,
  usersTable,
  userPreferencesTable,
  booksTable,
  bookPagesTable,
  readingProgressTable,
  bookmarksTable,
  notesTable,
  type User,
  type UserPreferences,
  type Book,
  type BookPage,
  type ReadingProgress,
  type Bookmark,
  type Note,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "node:crypto";
import { hashPassword } from "./auth";

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
  pages: Map<string, BookPage[]>;
  progress: Map<string, ReadingProgress>; // key: `${userId}:${bookId}`
  bookmarks: Map<string, Bookmark>;
  notes: Map<string, Note>;
}

const memoryStore: InMemoryStore = {
  users: new Map(),
  preferences: new Map(),
  books: new Map(),
  pages: new Map(),
  progress: new Map(),
  bookmarks: new Map(),
  notes: new Map(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryStore.preferences.set(userId, defaultPref);
  return defaultPref;
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<Pick<UserPreferences, "language" | "theme" | "readingMode" | "fontSize">>,
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
      textContent: p.textContent,
      ocrConfidence: 100,
      isBlank: false,
      createdAt: now,
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
    const books = await db.select().from(booksTable).where(eq(booksTable.userId, userId));
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
        progressPercent: currentProg?.progressPercent ?? Math.round((b.currentPage / b.totalPages) * 100),
        coverUrl: b.coverUrl || undefined,
        sourceType: b.sourceType,
        processingStatus: b.processingStatus,
        lastReadAt: currentProg?.lastReadAt?.toISOString(),
      });
    }
    return summaries;
  }

  // Memory fallback
  const userBooks: BookSummaryData[] = [];
  for (const b of memoryStore.books.values()) {
    if (b.userId === userId) {
      const prog = memoryStore.progress.get(`${userId}:${b.id}`);
      userBooks.push({
        id: b.id,
        title: b.title,
        author: b.author || undefined,
        totalPages: b.totalPages,
        currentPage: prog?.currentPage ?? b.currentPage,
        progressPercent: prog?.progressPercent ?? Math.round((b.currentPage / b.totalPages) * 100),
        coverUrl: b.coverUrl || undefined,
        sourceType: b.sourceType,
        processingStatus: b.processingStatus,
        lastReadAt: prog?.lastReadAt?.toISOString(),
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
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)))
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
      progressPercent: Math.round((b.currentPage / b.totalPages) * 100),
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
      },
      pages,
      progress,
      bookmarks,
      notes,
    };
  }

  // Memory fallback
  const b = memoryStore.books.get(bookId);
  if (!b || b.userId !== userId) {
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
      progressPercent: Math.round((b.currentPage / b.totalPages) * 100),
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
    },
    pages,
    progress,
    bookmarks,
    notes,
  };
}

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
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)))
      .limit(1);

    if (!bookRes[0]) return null;
    const b = bookRes[0];
    const safePage = Math.max(1, Math.min(b.totalPages, data.currentPage));
    const percent = data.progressPercent ?? Math.round((safePage / b.totalPages) * 100);
    const completed = data.completed ?? safePage >= b.totalPages;

    const existing = await db
      .select()
      .from(readingProgressTable)
      .where(and(eq(readingProgressTable.userId, userId), eq(readingProgressTable.bookId, bookId)))
      .limit(1);

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
  if (!b || b.userId !== userId) return null;

  const safePage = Math.max(1, Math.min(b.totalPages, data.currentPage));
  const percent = data.progressPercent ?? Math.round((safePage / b.totalPages) * 100);
  const completed = data.completed ?? safePage >= b.totalPages;

  b.currentPage = safePage;
  b.updatedAt = now;

  let progress = memoryStore.progress.get(`${userId}:${bookId}`);
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
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)))
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
  if (!b || b.userId !== userId) return null;

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
    const res = await db
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
      .where(and(eq(booksTable.id, bookId), eq(booksTable.userId, userId)))
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
  if (!b || b.userId !== userId) return null;

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
