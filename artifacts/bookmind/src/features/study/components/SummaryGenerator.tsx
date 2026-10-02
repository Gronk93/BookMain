import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, BookOpen } from "lucide-react";
import {
  useGenerateStudySummary,
  type GenerateStudySummaryRequestSummaryType,
} from "@workspace/api-client-react";
import {
  StudyScopeSelector,
  type StudyScopeValue,
} from "./StudyScopeSelector";

interface SummaryGeneratorProps {
  bookId: string;
  totalPages?: number;
  onSuccess?: () => void;
}

export function SummaryGenerator({
  bookId,
  totalPages = 100,
  onSuccess,
}: SummaryGeneratorProps) {
  const { t } = useTranslation(["study", "common"]);

  const [scopeValue, setScopeValue] = useState<StudyScopeValue>({
    scope: { type: "page_range", startPage: 1, endPage: Math.min(totalPages, 10) },
    includeHighlights: true,
    includeNotes: false,
  });

  const [summaryType, setSummaryType] =
    useState<GenerateStudySummaryRequestSummaryType>("standard");

  const generateMutation = useGenerateStudySummary();

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({
        bookId,
        data: {
          scope: scopeValue.scope,
          summaryType,
          includeHighlights: scopeValue.includeHighlights,
          includeNotes: scopeValue.includeNotes,
        },
      });
      onSuccess?.();
    } catch (err) {
      console.error("Failed to generate summary:", err);
    }
  };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Sparkles size={18} className="text-primary" />
        <h3 className="font-serif text-base font-bold text-foreground">
          {t("summary.title", { defaultValue: "Resúmenes fundamentados" })}
        </h3>
      </div>

      {/* Scope Selector */}
      <StudyScopeSelector
        bookId={bookId}
        totalPages={totalPages}
        initialScope={scopeValue}
        onChange={setScopeValue}
        showPersonalOptions={true}
      />

      {/* Summary Type Selector (Section 15, 16, 17, 18) */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">
          {t("summary.type", { defaultValue: "Tipo de resumen" })}:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <label
            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
              summaryType === "brief"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:bg-secondary/60"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="summaryType"
                value="brief"
                checked={summaryType === "brief"}
                onChange={() => setSummaryType("brief")}
                className="text-primary focus:ring-primary/40"
              />
              <span className="font-semibold text-foreground">
                {t("summary.brief", { defaultValue: "Breve" })}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("summary.briefDesc", {
                defaultValue: "Lectura rápida (idea central y 3–5 puntos clave)",
              })}
            </p>
          </label>

          <label
            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
              summaryType === "standard"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:bg-secondary/60"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="summaryType"
                value="standard"
                checked={summaryType === "standard"}
                onChange={() => setSummaryType("standard")}
                className="text-primary focus:ring-primary/40"
              />
              <span className="font-semibold text-foreground">
                {t("summary.standard", { defaultValue: "Estándar" })}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("summary.standardDesc", {
                defaultValue: "Comprensión completa y conceptos relevantes",
              })}
            </p>
          </label>

          <label
            className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
              summaryType === "deep"
                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                : "border-border hover:bg-secondary/60"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="summaryType"
                value="deep"
                checked={summaryType === "deep"}
                onChange={() => setSummaryType("deep")}
                className="text-primary focus:ring-primary/40"
              />
              <span className="font-semibold text-foreground">
                {t("summary.deep", { defaultValue: "Profundo" })}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t("summary.deepDesc", {
                defaultValue: "Preparación profunda con argumentos y ejemplos",
              })}
            </p>
          </label>
        </div>
      </div>

      {/* Error state */}
      {generateMutation.isError && (
        <p className="text-xs text-destructive">
          Ocurrió un error al preparar el resumen. Verifica el alcance seleccionado.
        </p>
      )}

      {/* Generate Action Button */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition shadow-sm"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>{t("summary.generating", { defaultValue: "Preparando tu material..." })}</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>{t("summary.generate", { defaultValue: "Generar resumen" })}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
