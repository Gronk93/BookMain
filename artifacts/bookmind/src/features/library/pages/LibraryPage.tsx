import React, { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { BookOpen, Search, ArrowRight } from "lucide-react";
import { useGetBooks, getGetBooksQueryKey, type BookSummary } from "@workspace/api-client-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { HeroBanner } from "../components/HeroBanner";
import { WeeklyStats } from "../components/WeeklyStats";
import { BookCard } from "../components/BookCard";
import { EmptyLibrary } from "../components/EmptyLibrary";
import { ImportModal } from "@/features/import/components/ImportModal";

const FALLBACK_BOOKS: BookSummary[] = [
  {
    id: "ways-of-seeing",
    title: "Ways of Seeing",
    author: "John Berger",
    totalPages: 176,
    currentPage: 48,
    progressPercent: 27,
    sourceType: "sample",
    processingStatus: "ready",
  },
  {
    id: "living-mountain",
    title: "The Living Mountain",
    author: "Nan Shepherd",
    totalPages: 160,
    currentPage: 22,
    progressPercent: 14,
    sourceType: "sample",
    processingStatus: "ready",
  },
  {
    id: "the-waves",
    title: "The Waves",
    author: "Virginia Woolf",
    totalPages: 212,
    currentPage: 1,
    progressPercent: 0,
    sourceType: "sample",
    processingStatus: "ready",
  },
];

export function LibraryPage() {
  const { t } = useTranslation("library");
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Fetch books from API; fall back to initial books if offline or loading initial state
  const { data: apiBooks, isLoading } = useGetBooks({
    query: {
      queryKey: getGetBooksQueryKey(),
      enabled: !!user,
      staleTime: 10_000,
    },
  });

  const books: BookSummary[] = (apiBooks && apiBooks.length > 0) ? apiBooks : FALLBACK_BOOKS;

  const filtered = books.filter((b) =>
    `${b.title} ${b.author || ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  const activeBook = books[0] || FALLBACK_BOOKS[0];
  const activeProgress = activeBook.progressPercent ?? Math.round((activeBook.currentPage / (activeBook.totalPages || 1)) * 100);

  return (
    <main className="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8">
      <HeroBanner onAddBook={() => setImportModalOpen(true)} />

      <section className="grid gap-8 py-10 lg:grid-cols-[1.15fr_.85fr]">
        {/* Continue Reading Card */}
        <div className="rounded-3xl bg-primary p-7 text-primary-foreground shadow-[0_20px_50px_rgba(49,86,83,.16)] sm:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mono text-[10px] uppercase tracking-[0.2em] text-primary-foreground/65">
                  {t("continueReading")}
                </p>
                <h2 className="serif mt-3 text-4xl leading-tight font-medium">
                  {activeBook.title}
                </h2>
                {activeBook.author && (
                  <p className="mt-2.5 text-sm text-primary-foreground/75">
                    {activeBook.author}
                  </p>
                )}
              </div>
              <BookOpen size={24} className="text-primary-foreground/60 shrink-0" />
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm text-primary-foreground/70">
                  Capítulo 01 · Ver
                </p>
                <p className="mono mt-1.5 text-xs text-primary-foreground/60">
                  {t("pageOf", { current: activeBook.currentPage, total: activeBook.totalPages })}
                </p>
              </div>
              <span className="serif text-4xl">{activeProgress}%</span>
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-[#D3A16E] transition-all duration-300"
                style={{ width: `${Math.max(activeProgress, 2)}%` }}
              />
            </div>

            <Link
              href={`/read/${activeBook.id}`}
              className="mt-7 flex w-fit items-center gap-2 text-sm font-medium text-primary-foreground hover:underline"
            >
              {t("continueReading")} <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Weekly Stats */}
        <WeeklyStats activeBooksCount={books.length} />
      </section>

      {/* Library Grid */}
      <section className="pt-2">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {t("yourLibrary")}
            </p>
            <h2 className="serif mt-2 text-3xl font-medium">{t("booksToReturnTo")}</h2>
          </div>

          <label className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground shadow-sm">
            <Search size={16} className="text-muted-foreground/70" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-44 bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
          </label>
        </div>

        {filtered.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b, index) => (
              <BookCard key={b.id} book={b} index={index} />
            ))}
          </div>
        ) : (
          <EmptyLibrary isSearch={search.length > 0} />
        )}
      </section>

      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
    </main>
  );
}
