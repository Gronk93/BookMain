import React, { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  RotateCw,
  ExternalLink,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  useGetReviewQueue,
  useSubmitCardReview,
  useStartStudySession,
  useCompleteStudySession,
  type FlashcardReviewRating,
  type Flashcard,
} from "@workspace/api-client-react";
import { ReviewRatingButtons } from "./ReviewRating";
import { StudySessionSummary } from "./StudySessionSummary";

interface FlashcardPlayerProps {
  bookId: string;
  deckId?: string;
  onExit?: () => void;
}

export function FlashcardPlayer({ bookId, deckId, onExit }: FlashcardPlayerProps) {
  const { t } = useTranslation(["study", "common"]);

  const [reviewAll, setReviewAll] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Counters
  const [cardsSeen, setCardsSeen] = useState(0);
  const [cardsAgain, setCardsAgain] = useState(0);
  const [cardsHard, setCardsHard] = useState(0);
  const [cardsGood, setCardsGood] = useState(0);
  const [cardsEasy, setCardsEasy] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Queries & Mutations
  const {
    data: queueData,
    isLoading,
    refetch,
  } = useGetReviewQueue(
    bookId,
    {
      deckId: deckId || undefined,
      all: reviewAll,
    },
    {
      query: {
        refetchOnWindowFocus: false,
      } as any,
    }
  );

  const startSessionMutation = useStartStudySession();
  const completeSessionMutation = useCompleteStudySession();
  const submitReviewMutation = useSubmitCardReview();

  const cards: Flashcard[] = queueData?.items || [];
  const currentCard = cards[currentIndex];

  // Start study session once queue is loaded
  useEffect(() => {
    if (cards.length > 0 && !sessionId && !sessionCompleted) {
      startSessionMutation
        .mutateAsync({
          bookId,
          data: {
            deckId: deckId || undefined,
            sessionType: "review",
          },
        })
        .then((session) => {
          setSessionId(session.id);
        })
        .catch((err) => {
          console.error("Failed to start session:", err);
        });
    }
  }, [cards.length, sessionId, bookId, deckId, sessionCompleted]);

  // Handle rating a card
  const handleRate = useCallback(
    async (rating: FlashcardReviewRating) => {
      if (!currentCard) return;

      try {
        await submitReviewMutation.mutateAsync({
          bookId,
          cardId: currentCard.id,
          data: { rating },
        });

        // Update counters
        setCardsSeen((s) => s + 1);
        if (rating === "again") setCardsAgain((c) => c + 1);
        else if (rating === "hard") setCardsHard((c) => c + 1);
        else if (rating === "good") setCardsGood((c) => c + 1);
        else if (rating === "easy") setCardsEasy((c) => c + 1);

        setShowAnswer(false);

        if (currentIndex + 1 < cards.length) {
          setCurrentIndex((i) => i + 1);
        } else {
          // Finish session
          setSessionCompleted(true);
          if (sessionId) {
            await completeSessionMutation.mutateAsync({
              bookId,
              sessionId,
              data: {
                cardsSeen: cardsSeen + 1,
                cardsAgain: rating === "again" ? cardsAgain + 1 : cardsAgain,
                cardsHard: rating === "hard" ? cardsHard + 1 : cardsHard,
                cardsGood: rating === "good" ? cardsGood + 1 : cardsGood,
                cardsEasy: rating === "easy" ? cardsEasy + 1 : cardsEasy,
              },
            });
          }
        }
      } catch (err) {
        console.error("Failed to submit review:", err);
      }
    },
    [
      currentCard,
      bookId,
      currentIndex,
      cards.length,
      sessionId,
      cardsSeen,
      cardsAgain,
      cardsHard,
      cardsGood,
      cardsEasy,
      submitReviewMutation,
      completeSessionMutation,
    ]
  );

  // Keyboard shortcut handler (Section 96)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setShowAnswer((prev) => !prev);
      } else if (showAnswer) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate("again");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate("hard");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate("good");
        } else if (e.key === "4") {
          e.preventDefault();
          handleRate("easy");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAnswer, handleRate]);

  const restartReview = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setCardsSeen(0);
    setCardsAgain(0);
    setCardsHard(0);
    setCardsGood(0);
    setCardsEasy(0);
    setSessionCompleted(false);
    setSessionId(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="py-24 flex justify-center">
        <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // Session summary when finished
  if (sessionCompleted) {
    return (
      <StudySessionSummary
        cardsSeen={cardsSeen}
        cardsAgain={cardsAgain}
        cardsHard={cardsHard}
        cardsGood={cardsGood}
        cardsEasy={cardsEasy}
        onStudyAgain={restartReview}
        onReturnToStudy={() => onExit?.()}
      />
    );
  }

  // Empty queue
  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border border-dashed border-border/80 p-8 text-center space-y-4">
        <CheckCircle2 className="mx-auto size-12 text-emerald-500/70" />
        <h3 className="font-serif text-lg font-bold text-foreground">
          {t("review.noPending", { defaultValue: "No tienes tarjetas pendientes de repaso." })}
        </h3>
        <p className="text-xs text-muted-foreground">
          ¡Excelente! Estás al día con tus tarjetas para este libro.
        </p>

        {!reviewAll && (
          <div className="pt-2">
            <button
              onClick={() => setReviewAll(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-secondary transition shadow-xs"
            >
              <RotateCw size={13} />
              <span>{t("reviewAll", { defaultValue: "Repasar de todos modos" })}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Top Bar with Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {onExit && (
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1 hover:text-foreground transition"
          >
            <ArrowLeft size={14} />
            <span>Volver</span>
          </button>
        )}

        <div className="font-mono font-medium">
          Tarjeta {currentIndex + 1} de {cards.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Flashcard Box */}
      <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-lg min-h-[300px] flex flex-col justify-between transition-all">
        {/* Card Header & Type */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-4 border-b border-border/40">
          <span className="uppercase font-semibold tracking-wider text-[10px] bg-secondary px-2.5 py-0.5 rounded-full">
            {currentCard.cardType}
          </span>

          <span className="font-medium text-[11px] rounded bg-secondary px-2 py-0.5">
            {currentCard.origin === "ai" ? "IA" : "Manual"}
          </span>
        </div>

        {/* Card Content */}
        <div className="py-8 space-y-6 text-center my-auto">
          {/* Front / Question */}
          <div className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-snug">
            {currentCard.front}
          </div>

          {/* Back / Answer (Shown only when revealed) */}
          {showAnswer ? (
            <div className="pt-6 border-t border-border/40 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="text-base text-foreground/90 leading-relaxed font-sans">
                {currentCard.back}
              </div>

              {currentCard.explanation && (
                <p className="text-xs text-muted-foreground italic max-w-lg mx-auto">
                  {currentCard.explanation}
                </p>
              )}

              {/* Source page citation deep link (Section 20 & 42) */}
              {currentCard.sourcePage && (
                <div className="pt-2 flex justify-center">
                  <Link
                    href={`/read/${bookId}?page=${currentCard.sourcePage}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-mono font-medium text-primary hover:bg-primary/20 hover:underline transition"
                    title={`Abrir página ${currentCard.sourcePage} en el lector`}
                  >
                    <span>Fuente: p. {currentCard.sourcePage}</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-4">
              <button
                onClick={() => setShowAnswer(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-secondary px-6 py-3 text-xs font-semibold text-foreground hover:bg-secondary/80 transition shadow-xs hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{t("review.showAnswer", { defaultValue: "Mostrar respuesta" })}</span>
                <span className="text-[10px] text-muted-foreground font-mono">(Espacio)</span>
              </button>
            </div>
          )}
        </div>

        {/* Rating Controls (Shown when answer revealed) */}
        {showAnswer ? (
          <div className="pt-6 border-t border-border/40">
            <ReviewRatingButtons
              onRate={handleRate}
              disabled={submitReviewMutation.isPending}
            />
          </div>
        ) : (
          <div className="h-4" />
        )}
      </div>
    </div>
  );
}
