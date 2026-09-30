import React from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { FileText, Sparkles } from "lucide-react";
import { Cover } from "./Cover";
import type { BookSummary } from "@workspace/api-client-react";

interface BookCardProps {
  book: BookSummary;
  index: number;
}

const PALETTE = [
  { color: "#315653", accent: "#D3A16E", label: "SEE / THINK" },
  { color: "#788B79", accent: "#EFE0C4", label: "A MOUNTAIN" },
  { color: "#42536B", accent: "#B8C7D1", label: "THE WAVES" },
  { color: "#5B526F", accent: "#E2B6A4", label: "NEW READING" },
];

export function BookCard({ book, index }: BookCardProps) {
  const { t } = useTranslation("library");
  const palette = PALETTE[index % PALETTE.length];
  const progress = book.progressPercent ?? Math.round((book.currentPage / (book.totalPages || 1)) * 100);

  const isPdf = book.sourceType === "pdf";
  const isReadyForProcessing = book.processingStatus === "ready_for_processing";

  return (
    <Link
      href={`/read/${book.id}`}
      className="group animate-rise-in block rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex gap-4 sm:gap-5">
        <Cover
          title={book.title}
          label={isPdf ? "PDF ORIGINAL" : palette.label}
          color={isPdf ? "#2c3b38" : palette.color}
          accent={isPdf ? "#D3A16E" : palette.accent}
          compact
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground flex items-center gap-1">
                {isPdf ? (
                  <>
                    <FileText size={10} className="text-primary" />
                    <span>PDF</span>
                  </>
                ) : (
                  <span>Ensayo</span>
                )}
              </span>

              {book.processingStatus === "processing" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-600 dark:text-amber-400 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span>{t("statusProcessing")}</span>
                </span>
              )}

              {isReadyForProcessing && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-medium text-blue-600 dark:text-blue-400">
                  <Sparkles size={8} />
                  <span>{t("statusReady")}</span>
                </span>
              )}

              {book.processingStatus === "completed" && isPdf && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                  <Sparkles size={8} />
                  <span>{t("statusCompleted")}</span>
                </span>
              )}
            </div>

            <h3 className="serif mt-1.5 text-xl font-medium leading-snug line-clamp-2">
              {book.title}
            </h3>
            {book.author && (
              <p className="mt-1.5 text-xs text-muted-foreground line-clamp-1">
                {book.author}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{t("pageOf", { current: book.currentPage, total: book.totalPages })}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
