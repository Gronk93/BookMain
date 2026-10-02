import React from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Play,
  Clock,
  Calendar,
  Layers,
  FileText,
  Lightbulb,
} from "lucide-react";
import {
  useGetStudyOverview,
  useGetBooks,
  type BookSummary,
} from "@workspace/api-client-react";
import { StudyBookCard } from "../components/StudyBookCard";

export function StudyHomePage() {
  const { t } = useTranslation(["study", "common"]);
  const [, setLocation] = useLocation();

  const { data: books = [], isLoading: loadingBooks } = useGetBooks();
  const { data: overview, isLoading: loadingOverview } = useGetStudyOverview();

  const isLoading = loadingBooks || loadingOverview;

  const totalDueCards = overview?.dueCardsToday ?? 0;
  const recentSessions = overview?.recentSessions ?? [];

  // Find most relevant book to "Continue studying"
  const continueBookId = recentSessions[0]?.bookId || books[0]?.id;
  const continueBook = books.find((b) => b.id === continueBookId);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="size-8 text-primary" />
            <span>{t("title", { defaultValue: "Estudio" })}</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {t("subtitle", {
              defaultValue:
                "Transforma tus lecturas y subrayados en resúmenes verificables, conceptos y tarjetas de estudio.",
            })}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex justify-center">
          <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center rounded-3xl border border-dashed border-border/80 py-20 px-6">
          <BookOpen className="mx-auto size-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-serif text-lg font-medium text-foreground">
            {t("noBooks", { defaultValue: "No tienes libros importados aún." })}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Importa un libro en tu biblioteca para comenzar a generar resúmenes y tarjetas de estudio.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            Ir a la biblioteca
          </Link>
        </div>
      ) : (
        <>
          {/* Due Today Banner (Section 7) */}
          {totalDueCards > 0 && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-wider">
                  <Clock size={15} />
                  <span>{t("dueToday", { defaultValue: "Para repasar hoy" })}</span>
                </div>
                <h3 className="font-serif text-2xl font-bold text-foreground">
                  {totalDueCards} {totalDueCards === 1 ? "tarjeta pendiente" : "tarjetas pendientes"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mantén fresca tu memoria repasando las tarjetas programadas para hoy con repetición espaciada.
                </p>
              </div>

              {continueBookId && (
                <button
                  onClick={() => setLocation(`/study/${continueBookId}?tab=review`)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play size={14} />
                  <span>{t("startReview", { defaultValue: "Repasar ahora" })}</span>
                </button>
              )}
            </div>
          )}

          {/* Continúa estudiando (Section 7) */}
          {continueBook && (
            <div className="space-y-3">
              <h2 className="font-serif text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                {t("continueStudying", { defaultValue: "Continúa estudiando" })}
              </h2>

              <div className="rounded-3xl border border-border bg-card p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:border-border/80 transition">
                <div className="flex items-start gap-4">
                  <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0">
                    <BookOpen size={26} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                      {continueBook.title}
                    </h3>
                    {continueBook.author && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {continueBook.author}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                      <span className="font-mono text-xs">
                        Pág. {continueBook.currentPage} / {continueBook.totalPages} ({continueBook.progressPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/study/${continueBook.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-5 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition"
                >
                  <span>Entrar a estudio</span>
                </Link>
              </div>
            </div>
          )}

          {/* Mis libros (Section 7) */}
          <div className="space-y-4">
            <h2 className="font-serif text-sm font-semibold tracking-wider text-muted-foreground uppercase">
              {t("myBooks", { defaultValue: "Mis libros" })}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <StudyBookCard key={book.id} book={book} />
              ))}
            </div>
          </div>

          {/* Actividad reciente (Section 7) */}
          {recentSessions.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <h2 className="font-serif text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                {t("recentActivity", { defaultValue: "Actividad reciente" })}
              </h2>

              <div className="space-y-2">
                {recentSessions.map((session) => {
                  const sBook = books.find((b) => b.id === session.bookId);
                  const formattedDate = new Date(
                    session.completedAt || session.startedAt
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-border/70 bg-card p-4 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-xl bg-secondary text-muted-foreground">
                          <Clock size={14} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {sBook?.title || "Libro"}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {session.cardsSeen} tarjetas repasadas • {formattedDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="text-red-500 font-medium">
                          {session.cardsAgain} rep
                        </span>
                        <span>•</span>
                        <span className="text-emerald-500 font-medium">
                          {session.cardsGood + session.cardsEasy} ok
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
