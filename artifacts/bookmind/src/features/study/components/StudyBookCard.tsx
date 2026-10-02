import React from "react";
import { Link } from "wouter";
import { BookOpen, FileText, Lightbulb, Layers, Clock, ArrowRight } from "lucide-react";
import type { BookSummary } from "@workspace/api-client-react";

interface StudyBookCardProps {
  book: BookSummary;
  summariesCount?: number;
  conceptsCount?: number;
  cardsCount?: number;
  dueCount?: number;
}

export function StudyBookCard({
  book,
  summariesCount = 0,
  conceptsCount = 0,
  cardsCount = 0,
  dueCount = 0,
}: StudyBookCardProps) {
  return (
    <Link
      href={`/study/${book.id}`}
      className="group rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-base sm:text-lg font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {book.title}
            </h3>
            {book.author && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {book.author}
              </p>
            )}
          </div>
        </div>

        {/* Due cards banner if any */}
        {dueCount > 0 && (
          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Clock size={13} className="shrink-0" />
            <span>
              {dueCount} {dueCount === 1 ? "tarjeta pendiente" : "tarjetas pendientes"}
            </span>
          </div>
        )}

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
          <div className="rounded-xl bg-secondary/50 p-2">
            <div className="text-xs font-bold text-foreground font-mono">
              {summariesCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Resúmenes</div>
          </div>
          <div className="rounded-xl bg-secondary/50 p-2">
            <div className="text-xs font-bold text-foreground font-mono">
              {conceptsCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Conceptos</div>
          </div>
          <div className="rounded-xl bg-secondary/50 p-2">
            <div className="text-xs font-bold text-foreground font-mono">
              {cardsCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Tarjetas</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-primary font-medium">
        <span>Abrir estudio</span>
        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Link>
  );
}
