import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, RotateCcw, ArrowLeft, Trophy } from "lucide-react";

interface StudySessionSummaryProps {
  cardsSeen: number;
  cardsAgain: number;
  cardsHard: number;
  cardsGood: number;
  cardsEasy: number;
  onStudyAgain: () => void;
  onReturnToStudy: () => void;
}

export function StudySessionSummary({
  cardsSeen,
  cardsAgain,
  cardsHard,
  cardsGood,
  cardsEasy,
  onStudyAgain,
  onReturnToStudy,
}: StudySessionSummaryProps) {
  const { t } = useTranslation(["study", "common"]);

  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-md text-center space-y-6 animate-in fade-in zoom-in-95">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Trophy size={28} />
      </div>

      <div className="space-y-1">
        <h3 className="font-serif text-2xl font-bold text-foreground">
          {t("review.completedTitle", { defaultValue: "¡Sesión completada!" })}
        </h3>
        <p className="text-xs text-muted-foreground">
          {t("review.completedDesc", {
            defaultValue: "Has repasado todas las tarjetas seleccionadas.",
          })}
        </p>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-4 gap-2 pt-2">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3">
          <span className="text-lg font-bold text-red-600 dark:text-red-400 font-mono">
            {cardsAgain}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Repetir</p>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
            {cardsHard}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Difícil</p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {cardsGood}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Bien</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
            {cardsEasy}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Fácil</p>
        </div>
      </div>

      <div className="text-xs text-muted-foreground font-mono">
        Total repasadas: {cardsSeen} tarjetas
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onReturnToStudy}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-5 py-2.5 text-xs font-medium text-foreground hover:bg-secondary transition"
        >
          <ArrowLeft size={14} />
          <span>{t("review.returnToStudy", { defaultValue: "Volver a estudio" })}</span>
        </button>

        <button
          onClick={onStudyAgain}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <RotateCcw size={14} />
          <span>{t("review.studyAgain", { defaultValue: "Repasar de nuevo" })}</span>
        </button>
      </div>
    </div>
  );
}
