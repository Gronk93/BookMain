import React from "react";
import { useTranslation } from "react-i18next";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function BookmarkButton({
  isBookmarked,
  onToggle,
  disabled = false,
}: BookmarkButtonProps) {
  const { t } = useTranslation("reader");

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="rounded-full p-2.5 text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground hover-elevate disabled:opacity-50"
      aria-label={isBookmarked ? t("removeBookmark") : t("saveBookmark")}
      title={isBookmarked ? t("removeBookmark") : t("saveBookmark")}
    >
      {isBookmarked ? (
        <BookmarkCheck size={18} className="text-accent" />
      ) : (
        <Bookmark size={18} />
      )}
    </button>
  );
}
