import React, { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Lightbulb,
  Sparkles,
  Loader2,
  ExternalLink,
  BookOpen,
  Filter,
} from "lucide-react";
import {
  useListBookConcepts,
  useGenerateBookConcepts,
  type StudyConceptDetail,
} from "@workspace/api-client-react";
import {
  StudyScopeSelector,
  type StudyScopeValue,
} from "./StudyScopeSelector";

interface ConceptListProps {
  bookId: string;
  totalPages?: number;
}

export function ConceptList({ bookId, totalPages = 100 }: ConceptListProps) {
  const { t } = useTranslation(["study", "common"]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [importanceFilter, setImportanceFilter] = useState<string>("all");

  const [scopeValue, setScopeValue] = useState<StudyScopeValue>({
    scope: { type: "book" },
    includeHighlights: true,
    includeNotes: false,
  });

  const { data: responseData, isLoading, refetch } = useListBookConcepts(bookId);
  const conceptDetails: StudyConceptDetail[] = responseData?.items || [];
  const generateMutation = useGenerateBookConcepts();

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({
        bookId,
        data: {
          scope: scopeValue.scope,
        },
      });
      setShowGenerator(false);
      refetch();
    } catch (err) {
      console.error("Failed to generate concepts:", err);
    }
  };

  const filteredConcepts = conceptDetails.filter((detail) => {
    if (importanceFilter === "all") return true;
    return detail.concept.importance === importanceFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header and actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="text-primary size-6" />
            <span>{t("concepts.title", { defaultValue: "Conceptos fundamentales" })}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Ideas estructuradas, definiciones y relaciones extraídas del texto.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Importance filter */}
          {conceptDetails.length > 0 && (
            <select
              value={importanceFilter}
              onChange={(e) => setImportanceFilter(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">Todas las importancias</option>
              <option value="essential">Fundamentales</option>
              <option value="high">Altas</option>
              <option value="medium">Medias</option>
            </select>
          )}

          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Sparkles size={14} />
            <span>{t("concepts.generate", { defaultValue: "Extraer conceptos" })}</span>
          </button>
        </div>
      </div>

      {/* Generator Accordion */}
      {showGenerator && (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <StudyScopeSelector
            bookId={bookId}
            totalPages={totalPages}
            initialScope={scopeValue}
            onChange={setScopeValue}
            showPersonalOptions={false}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowGenerator(false)}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>{t("concepts.generating", { defaultValue: "Identificando conceptos clave..." })}</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  <span>Extraer</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Concept list */}
      {isLoading ? (
        <div className="py-16 flex justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filteredConcepts.length === 0 ? (
        <div className="text-center rounded-2xl border border-dashed border-border/70 py-16 px-4">
          <Lightbulb className="mx-auto size-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-serif text-base font-medium text-foreground">
            {t("concepts.empty", { defaultValue: "Aún no se han extraído conceptos para este libro." })}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Selecciona un alcance y extrae los términos e ideas centrales con sus fuentes correspondientes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredConcepts.map(({ concept, sources }) => {
            const importanceBadge =
              concept.importance === "essential" ? (
                <span className="rounded-full bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  Fundamental
                </span>
              ) : concept.importance === "high" ? (
                <span className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  Alta
                </span>
              ) : (
                <span className="rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  Media
                </span>
              );

            return (
              <div
                key={concept.id}
                className="rounded-2xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-base font-bold text-foreground">
                      {concept.term}
                    </h3>
                    {importanceBadge}
                  </div>

                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {concept.definition}
                  </p>

                  {concept.simpleExplanation && (
                    <div className="pt-1 text-[11px] text-muted-foreground italic border-l-2 border-primary/40 pl-2.5">
                      <span className="font-semibold not-italic">¿Por qué importa? </span>
                      {concept.simpleExplanation}
                    </div>
                  )}
                </div>

                {/* Sources chips */}
                {sources && sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mr-1">
                      Págs:
                    </span>
                    {sources.map((src) => (
                      <Link
                        key={src.id}
                        href={`/read/${bookId}?page=${src.pageNumber}`}
                        className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                        title={src.quote ? `“${src.quote}”` : `Página ${src.pageNumber}`}
                      >
                        <span>p. {src.pageNumber}</span>
                        <ExternalLink size={9} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
