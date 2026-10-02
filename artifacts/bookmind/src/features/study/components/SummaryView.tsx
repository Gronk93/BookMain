import React from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  FileText,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Bookmark,
  Sparkles,
  UserCheck,
} from "lucide-react";
import type { StudySummary, StudySummarySource } from "@workspace/api-client-react";

interface SummaryViewProps {
  summary: StudySummary;
  sources?: StudySummarySource[];
  bookId: string;
  onDelete?: (summaryId: string) => void;
}

export function SummaryView({ summary, sources, bookId, onDelete }: SummaryViewProps) {
  const { t } = useTranslation(["study", "common"]);

  // Render content with interactive citation links [p. X]
  const renderInteractiveContent = (content: string) => {
    // Regex for [p. X] or [p. X-Y]
    const parts = content.split(/(\[p\.\s*\d+(?:-\d+)?\])/gi);

    return parts.map((part, idx) => {
      const match = part.match(/\[p\.\s*(\d+)(?:-\d+)?\]/i);
      if (match) {
        const pageNum = match[1];
        return (
          <Link
            key={idx}
            href={`/read/${bookId}?page=${pageNum}`}
            className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-primary/10 text-primary hover:bg-primary/20 hover:underline transition"
            title={`Abrir página ${pageNum} en el lector`}
          >
            <span>p. {pageNum}</span>
            <ExternalLink size={10} />
          </Link>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const isOutdated = summary.status === "outdated";
  const isPersonal = summary.title?.toLowerCase().includes("personal") || summary.content.includes("Tu nota");

  const formattedDate = new Date(summary.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <Sparkles size={12} />
              <span>
                {summary.summaryType === "brief"
                  ? t("summary.brief", { defaultValue: "Resumen Breve" })
                  : summary.summaryType === "deep"
                  ? t("summary.deep", { defaultValue: "Resumen Profundo" })
                  : t("summary.standard", { defaultValue: "Resumen Estándar" })}
              </span>
            </span>

            {isPersonal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <UserCheck size={12} />
                <span>Estudio Personal</span>
              </span>
            )}

            <span className="text-xs text-muted-foreground font-mono">
              {summary.scopeType}
            </span>
          </div>

          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground">
            {summary.title || "Resumen de Estudio"}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
        </div>

        {onDelete && (
          <button
            onClick={() => onDelete(summary.id)}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition self-end sm:self-start"
            title="Eliminar resumen"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Outdated Warning Notice (Section 21, 86, 88) */}
      {isOutdated && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <p>
            {t("summary.outdated", {
              defaultValue:
                "El contenido fuente del libro cambió desde que se generó este resumen.",
            })}
          </p>
        </div>
      )}

      {/* Notice for personal notes distinction (Section 14) */}
      {isPersonal && (
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-xs text-muted-foreground">
          <p>
            {t("summary.userNotesNotice", {
              defaultValue:
                "Nota: tus notas personales están claramente identificadas y no representan palabras directas del autor.",
            })}
          </p>
        </div>
      )}

      {/* Summary Content */}
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground whitespace-pre-wrap leading-relaxed font-sans text-sm sm:text-base">
        {renderInteractiveContent(summary.content)}
      </div>

      {/* Sources list (Section 24) */}
      {(() => {
        const sourceList: StudySummarySource[] = sources || (summary as any).sources || [];
        if (sourceList.length === 0) return null;
        return (
          <div className="pt-4 border-t border-border/50">
            <h4 className="font-serif text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3 flex items-center gap-1.5">
              <Bookmark size={13} className="text-primary" />
              <span>{t("summary.sources", { defaultValue: "Fuentes fundamentadas" })}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {sourceList.map((src) => (
              <Link
                key={src.id}
                href={`/read/${bookId}?page=${src.pageNumber}`}
                className="group flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-xs hover:bg-secondary/70 hover:border-primary/40 transition"
              >
                <span className="shrink-0 font-mono font-medium rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[11px]">
                  p. {src.pageNumber}
                </span>
                <span className="text-muted-foreground line-clamp-2 italic text-[11px] group-hover:text-foreground">
                  “{src.quote}”
                </span>
              </Link>
            ))}
          </div>
        </div>
      ); })()}
    </article>
  );
}
