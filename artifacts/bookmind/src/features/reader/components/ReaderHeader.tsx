import React from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, NotebookPen, Moon, Sun } from "lucide-react";
import { BookmarkButton } from "@/features/bookmarks/components/BookmarkButton";

interface ReaderHeaderProps {
  title: string;
  chapterTitle?: string;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  activePanel: "none" | "note" | "insight";
  onToggleNote: () => void;
  theme: "paper" | "sepia" | "night";
  onToggleTheme: () => void;
}

export function ReaderHeader({
  title,
  chapterTitle = "Chapter 01 · Seeing",
  isBookmarked,
  onToggleBookmark,
  activePanel,
  onToggleNote,
  theme,
  onToggleTheme,
}: ReaderHeaderProps) {
  const { t } = useTranslation("reader");

  return (
    <header className="mx-auto flex max-w-[1400px] items-center justify-between border-y border-border/50 px-5 py-3 sm:px-8">
      <Link
        href="/"
        className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft size={16} />
        <span>{t("backToLibrary")}</span>
      </Link>

      <div className="text-center px-4">
        <p className="serif text-lg font-medium line-clamp-1">{title}</p>
        <p className="mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          {chapterTitle}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <BookmarkButton
          isBookmarked={isBookmarked}
          onToggle={onToggleBookmark}
        />

        <button
          onClick={onToggleNote}
          className={`rounded-full p-2.5 transition hover-elevate ${
            activePanel === "note"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          }`}
          aria-label={t("openNotes")}
          title={t("openNotes")}
        >
          <NotebookPen size={18} />
        </button>

        <button
          onClick={onToggleTheme}
          className="rounded-full p-2.5 text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground hover-elevate"
          aria-label="Cambiar tema de lectura"
        >
          {theme === "night" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
