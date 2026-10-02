import React from "react";
import { useTranslation } from "react-i18next";
import type { FlashcardReviewRating } from "@workspace/api-client-react";

interface ReviewRatingProps {
  onRate: (rating: FlashcardReviewRating) => void;
  disabled?: boolean;
}

export function ReviewRatingButtons({ onRate, disabled }: ReviewRatingProps) {
  const { t } = useTranslation(["study", "common"]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-xl mx-auto">
      {/* 1: Again */}
      <button
        onClick={() => onRate("again")}
        disabled={disabled}
        className="flex flex-col items-center justify-center p-3 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 text-red-600 dark:text-red-400 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        <span className="text-xs font-bold tracking-tight">
          {t("review.again", { defaultValue: "Repetir" })}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          Hoy (1)
        </span>
      </button>

      {/* 2: Hard */}
      <button
        onClick={() => onRate("hard")}
        disabled={disabled}
        className="flex flex-col items-center justify-center p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 text-amber-600 dark:text-amber-400 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        <span className="text-xs font-bold tracking-tight">
          {t("review.hard", { defaultValue: "Difícil" })}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          +1 d (2)
        </span>
      </button>

      {/* 3: Good */}
      <button
        onClick={() => onRate("good")}
        disabled={disabled}
        className="flex flex-col items-center justify-center p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        <span className="text-xs font-bold tracking-tight">
          {t("review.good", { defaultValue: "Bien" })}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          +3 d (3)
        </span>
      </button>

      {/* 4: Easy */}
      <button
        onClick={() => onRate("easy")}
        disabled={disabled}
        className="flex flex-col items-center justify-center p-3 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15 text-blue-600 dark:text-blue-400 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        <span className="text-xs font-bold tracking-tight">
          {t("review.easy", { defaultValue: "Fácil" })}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          +7 d (4)
        </span>
      </button>
    </div>
  );
}
