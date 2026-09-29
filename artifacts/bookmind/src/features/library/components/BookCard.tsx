import React from "react";
import { Link } from "wouter";
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
  const palette = PALETTE[index % PALETTE.length];
  const progress = book.progressPercent ?? Math.round((book.currentPage / (book.totalPages || 1)) * 100);

  return (
    <Link
      href={`/read/${book.id}`}
      className="group animate-rise-in block rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-1 hover:shadow-[var(--shadow-soft)]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="flex gap-4 sm:gap-5">
        <Cover
          title={book.title}
          label={palette.label}
          color={palette.color}
          accent={palette.accent}
          compact
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
          <div>
            <p className="mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {book.sourceType === "sample" ? "Ensayo" : "Documento"}
            </p>
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
              <span>Página {book.currentPage} de {book.totalPages}</span>
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
