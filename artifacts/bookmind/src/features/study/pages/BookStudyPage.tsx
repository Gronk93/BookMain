import React, { useState, useEffect } from "react";
import { Link, useRoute } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Lightbulb,
  Layers,
  RotateCw,
  Plus,
  Sparkles,
  BarChart2,
  Trash2,
} from "lucide-react";
import {
  useGetBookDetails,
  useListBookSummaries,
  useDeleteStudySummary,
  useListFlashcardDecks,
  useGetReviewQueue,
  type StudySummary,
  type FlashcardDeck,
} from "@workspace/api-client-react";
import { SummaryGenerator } from "../components/SummaryGenerator";
import { SummaryView } from "../components/SummaryView";
import { ConceptList } from "../components/ConceptList";
import { FlashcardDeckList } from "../components/FlashcardDeckList";
import { FlashcardPlayer } from "../components/FlashcardPlayer";

type StudyTab = "summaries" | "concepts" | "flashcards" | "review";

export function BookStudyPage() {
  const { t } = useTranslation(["study", "common"]);
  const [, params] = useRoute("/study/:bookId");
  const bookId = params?.bookId || "";

  // Query parameter tab support (e.g. /study/:bookId?tab=review)
  const initialTab = (() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const tab = searchParams.get("tab") as StudyTab;
      if (tab && ["summaries", "concepts", "flashcards", "review"].includes(tab)) {
        return tab;
      }
    } catch {}
    return "summaries";
  })();

  const [activeTab, setActiveTab] = useState<StudyTab>(initialTab);
  const [showSummaryGenerator, setShowSummaryGenerator] = useState(false);
  const [reviewDeckId, setReviewDeckId] = useState<string | undefined>(undefined);

  // Queries
  const { data: bookDetails, isLoading: loadingBook } = useGetBookDetails(bookId);
  const {
    data: summariesData,
    isLoading: loadingSummaries,
    refetch: refetchSummaries,
  } = useListBookSummaries(bookId);
  const { data: decksData } = useListFlashcardDecks(bookId);
  const { data: reviewQueue } = useGetReviewQueue(bookId, { all: false });

  const summaries: StudySummary[] = summariesData?.items || [];
  const decks: FlashcardDeck[] = decksData?.items || [];

  const deleteSummaryMutation = useDeleteStudySummary();

  const totalCards = decks.reduce((sum, d) => sum + (d.cardsCount ?? 0), 0);
  const dueCardsCount = reviewQueue?.dueCount ?? 0;
  const totalPages = bookDetails?.book.totalPages || 100;

  const handleDeleteSummary = async (summaryId: string) => {
    if (!confirm("¿Deseas eliminar este resumen?")) return;
    try {
      await deleteSummaryMutation.mutateAsync({ bookId, summaryId });
      refetchSummaries();
    } catch (err) {
      console.error("Failed to delete summary:", err);
    }
  };

  const handleStartDeckReview = (deckId: string) => {
    setReviewDeckId(deckId);
    setActiveTab("review");
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 space-y-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-border/50 text-xs">
        <Link
          href="/study"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft size={14} />
          <span>Volver al Estudio</span>
        </Link>

        {bookDetails && (
          <Link
            href={`/read/${bookId}`}
            className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
          >
            <BookOpen size={13} />
            <span>Abrir en lector</span>
          </Link>
        )}
      </div>

      {/* Book Study Header */}
      {loadingBook ? (
        <div className="py-12 flex justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                Estudio
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mt-0.5">
                {bookDetails?.book.title || "Libro"}
              </h1>
              {bookDetails?.book.author && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bookDetails.book.author}
                </p>
              )}
            </div>

            {/* Study Progress Metric (Section 8 & 53) */}
            <div className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 text-xs font-mono space-y-1.5 min-w-[200px]">
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Tarjetas en memoria</span>
                <span className="font-bold text-foreground">{totalCards}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                <span>Pendientes hoy</span>
                <span className={`font-bold ${dueCardsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {dueCardsCount}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden mt-1">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{
                    width: `${
                      totalCards > 0
                        ? Math.max(10, Math.min(100, ((totalCards - dueCardsCount) / totalCards) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Section 8: Resumen, Conceptos, Flashcards, Repasar) */}
          <div className="flex border-b border-border/70 gap-2 sm:gap-6 pt-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("summaries")}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === "summaries"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={15} />
              <span>{t("tabs.summaries", { defaultValue: "Resumen" })}</span>
              {summaries.length > 0 && (
                <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[10px] font-mono">
                  {summaries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("concepts")}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === "concepts"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lightbulb size={15} />
              <span>{t("tabs.concepts", { defaultValue: "Conceptos" })}</span>
            </button>

            <button
              onClick={() => setActiveTab("flashcards")}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === "flashcards"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Layers size={15} />
              <span>{t("tabs.flashcards", { defaultValue: "Flashcards" })}</span>
              {totalCards > 0 && (
                <span className="rounded-full bg-secondary px-1.5 py-0.2 text-[10px] font-mono">
                  {totalCards}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setReviewDeckId(undefined);
                setActiveTab("review");
              }}
              className={`pb-3 text-xs sm:text-sm font-medium transition-colors flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                activeTab === "review"
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <RotateCw size={15} />
              <span>{t("tabs.review", { defaultValue: "Repasar" })}</span>
              {dueCardsCount > 0 && (
                <span className="rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 text-[10px] font-mono font-bold">
                  {dueCardsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      <div className="pt-2">
        {/* Tab 1: Summaries */}
        {activeTab === "summaries" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs text-muted-foreground">
                Síntesis verificables fundamentadas en las páginas del libro.
              </p>
              <button
                onClick={() => setShowSummaryGenerator(!showSummaryGenerator)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
              >
                <Sparkles size={14} />
                <span>{t("summary.generate", { defaultValue: "Generar resumen" })}</span>
              </button>
            </div>

            {showSummaryGenerator && (
              <SummaryGenerator
                bookId={bookId}
                totalPages={totalPages}
                onSuccess={() => {
                  setShowSummaryGenerator(false);
                  refetchSummaries();
                }}
              />
            )}

            {loadingSummaries ? (
              <div className="py-16 flex justify-center">
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : summaries.length === 0 ? (
              <div className="text-center rounded-2xl border border-dashed border-border/70 py-16 px-4">
                <FileText className="mx-auto size-10 text-muted-foreground/40 mb-3" />
                <h3 className="font-serif text-base font-medium text-foreground">
                  {t("summary.empty", { defaultValue: "No hay resúmenes generados para este libro." })}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Genera un resumen breve, estándar o profundo para organizar lo que has leído con citas verificables.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {summaries.map((summary) => (
                  <SummaryView
                    key={summary.id}
                    summary={summary}
                    bookId={bookId}
                    onDelete={handleDeleteSummary}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Concepts */}
        {activeTab === "concepts" && (
          <ConceptList bookId={bookId} totalPages={totalPages} />
        )}

        {/* Tab 3: Flashcards */}
        {activeTab === "flashcards" && (
          <FlashcardDeckList
            bookId={bookId}
            totalPages={totalPages}
            onSelectDeckForReview={handleStartDeckReview}
          />
        )}

        {/* Tab 4: Review / Repaso */}
        {activeTab === "review" && (
          <FlashcardPlayer
            bookId={bookId}
            deckId={reviewDeckId}
            onExit={() => setActiveTab("flashcards")}
          />
        )}
      </div>
    </div>
  );
}
