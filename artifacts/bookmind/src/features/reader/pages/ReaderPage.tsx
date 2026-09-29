import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Sparkles, NotebookPen, X } from "lucide-react";
import {
  useGetBookDetails,
  getGetBookDetailsQueryKey,
  useUpdateReadingProgress,
  useCreateBookmark,
  useDeleteBookmark,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  type BookDetailResponse,
  type Bookmark,
  type Note,
} from "@workspace/api-client-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ReaderHeader } from "../components/ReaderHeader";
import { InsightPanel } from "../components/InsightPanel";
import { NotePanel } from "@/features/notes/components/NotePanel";
import NotFound from "@/pages/not-found";

type ReaderTheme = "paper" | "sepia" | "night";

interface SamplePageContent {
  chapter: string;
  title: string;
  paragraphs: string[];
}

const PAGE_CONTENTS: Record<number, SamplePageContent> = {
  48: {
    chapter: "Chapter 01 · Seeing",
    title: "Seeing comes before words.",
    paragraphs: [
      "The child looks and recognizes before it can speak. But there is also another sense in which seeing comes before words.",
      "It is seeing which shapes our place in the world and determines what we notice.",
    ],
  },
  49: {
    chapter: "Chapter 01 · Seeing",
    title: "The visible world.",
    paragraphs: [
      "Soon after we can see, we are aware that we can also be seen. The eye of the other combines with our own eye to make it fully credible that we are part of the visible world.",
      "If we accept that we can see that hill over there, we propose that from that hill we can be seen. The reciprocal nature of vision is more fundamental than that of spoken dialogue.",
    ],
  },
};

function getPageContent(pageNumber: number): SamplePageContent {
  if (PAGE_CONTENTS[pageNumber]) {
    return PAGE_CONTENTS[pageNumber];
  }
  return {
    chapter: `Chapter 01 · Reading`,
    title: "The shape of an idea.",
    paragraphs: [
      "A book becomes useful when its ideas have somewhere to land. Reading is not only the act of moving through words; it is the moment a thought becomes part of your own way of seeing.",
      "Return to this page whenever you want to follow the thread again.",
    ],
  };
}

export function ReaderPage() {
  const { bookId = "" } = useParams<{ bookId: string }>();
  const { t } = useTranslation("reader");
  const { user } = useAuth();

  // Local theme
  const [theme, setTheme] = useState<ReaderTheme>(() => {
    try {
      const val = localStorage.getItem("bookmind-theme");
      return val ? JSON.parse(val) : "paper";
    } catch {
      return "paper";
    }
  });

  const [panel, setPanel] = useState<"none" | "insight" | "note">("none");
  const [selected, setSelected] = useState(false);

  // TanStack Query for book details
  const { data: apiDetails, refetch } = useGetBookDetails(bookId, {
    query: {
      queryKey: getGetBookDetailsQueryKey(bookId),
      enabled: !!user && !!bookId,
      staleTime: 5_000,
    },
  });

  // Local state initialized with fallback
  const [page, setPage] = useState<number>(() => {
    try {
      const savedPage = localStorage.getItem(`bookmind-page-${bookId}`);
      if (savedPage) return Number(savedPage);
    } catch {}
    return 48; // default to page 48
  });

  // Local bookmarks & notes cache for instant optimistic responsiveness
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[]>([]);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);

  // Mutations
  const updateProgressMutation = useUpdateReadingProgress();
  const createBookmarkMutation = useCreateBookmark();
  const deleteBookmarkMutation = useDeleteBookmark();
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

  // Hydrate from API when available
  useEffect(() => {
    if (apiDetails) {
      if (apiDetails.progress?.currentPage) {
        setPage(apiDetails.progress.currentPage);
      }
      if (apiDetails.bookmarks) {
        setLocalBookmarks(apiDetails.bookmarks);
      }
      if (apiDetails.notes) {
        setLocalNotes(apiDetails.notes);
      }
    }
  }, [apiDetails]);

  // Persist theme to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("bookmind-theme", JSON.stringify(theme));
    } catch {}
  }, [theme]);

  // Fallback book metadata if API has not responded yet
  const bookTitle = apiDetails?.book?.title || "Ways of Seeing";
  const totalPages = apiDetails?.book?.totalPages || 176;
  const currentCategory = "Essays";

  const percent = Math.round((page / totalPages) * 100);

  // Active bookmark for current page
  const currentBookmark = localBookmarks.find((bm) => bm.pageNumber === page);
  const isBookmarked = !!currentBookmark;

  // Active note for current page
  const currentNote = localNotes.find((n) => n.pageNumber === page);

  // Content for current page
  const content = getPageContent(page);

  // Page navigation
  const goToPage = async (nextPageNumber: number) => {
    const nextPage = Math.max(1, Math.min(totalPages, nextPageNumber));
    setPage(nextPage);
    try {
      localStorage.setItem(`bookmind-page-${bookId}`, String(nextPage));
    } catch {}

    // Send reading progress update to backend
    if (user && bookId) {
      try {
        await updateProgressMutation.mutateAsync({
          bookId,
          data: {
            currentPage: nextPage,
            progressPercent: Math.round((nextPage / totalPages) * 100),
            completed: nextPage >= totalPages,
          },
        });
      } catch {
        // Optimistic update remains active locally
      }
    }
  };

  // Toggle bookmark on current page
  const handleToggleBookmark = async () => {
    if (isBookmarked && currentBookmark) {
      // Optimistic delete
      setLocalBookmarks((prev) => prev.filter((b) => b.id !== currentBookmark.id));
      if (user && bookId) {
        try {
          await deleteBookmarkMutation.mutateAsync({
            bookId,
            bookmarkId: currentBookmark.id,
          });
        } catch {
          refetch();
        }
      }
    } else {
      // Optimistic create
      const tempId = `temp-${Date.now()}`;
      const newBm: Bookmark = {
        id: tempId,
        bookId,
        pageNumber: page,
        title: `Página ${page}`,
        createdAt: new Date().toISOString(),
      };
      setLocalBookmarks((prev) => [...prev, newBm]);
      if (user && bookId) {
        try {
          const created = await createBookmarkMutation.mutateAsync({
            bookId,
            data: {
              pageNumber: page,
              title: `Página ${page}`,
            },
          });
          setLocalBookmarks((prev) =>
            prev.map((b) => (b.id === tempId ? created : b)),
          );
        } catch {
          refetch();
        }
      }
    }
  };

  // Save note on current page
  const handleSaveNote = async (text: string) => {
    if (!text.trim()) return;

    if (currentNote) {
      // Update existing note
      const updatedNote: Note = {
        ...currentNote,
        content: text,
        updatedAt: new Date().toISOString(),
      };
      setLocalNotes((prev) =>
        prev.map((n) => (n.id === currentNote.id ? updatedNote : n)),
      );

      if (user && bookId) {
        try {
          await updateNoteMutation.mutateAsync({
            bookId,
            noteId: currentNote.id,
            data: { content: text },
          });
        } catch {
          refetch();
        }
      }
    } else {
      // Create new note
      const tempId = `temp-${Date.now()}`;
      const newNote: Note = {
        id: tempId,
        bookId,
        pageNumber: page,
        content: text,
        color: "amber",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setLocalNotes((prev) => [...prev, newNote]);

      if (user && bookId) {
        try {
          const created = await createNoteMutation.mutateAsync({
            bookId,
            data: {
              pageNumber: page,
              content: text,
              color: "amber",
            },
          });
          setLocalNotes((prev) =>
            prev.map((n) => (n.id === tempId ? created : n)),
          );
        } catch {
          refetch();
        }
      }
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!currentNote) return;
    setLocalNotes((prev) => prev.filter((n) => n.id !== currentNote.id));
    setPanel("none");

    if (user && bookId) {
      try {
        await deleteNoteMutation.mutateAsync({
          bookId,
          noteId: currentNote.id,
        });
      } catch {
        refetch();
      }
    }
  };

  const themeClasses =
    theme === "night"
      ? "bg-[#202928] text-[#E9E4D7]"
      : theme === "sepia"
      ? "bg-[#E7DAC3] text-[#4A3C2E]"
      : "reading-paper text-foreground";

  return (
    <div className={`min-h-[calc(100vh-72px)] transition-colors duration-300 ${themeClasses}`}>
      <ReaderHeader
        title={bookTitle}
        chapterTitle={content.chapter}
        isBookmarked={isBookmarked}
        onToggleBookmark={handleToggleBookmark}
        activePanel={panel}
        onToggleNote={() => setPanel(panel === "note" ? "none" : "note")}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "night" ? "paper" : "night")}
      />

      <div className="mx-auto grid max-w-[1400px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_320px]">
        {/* Main Reading Surface */}
        <main>
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 flex items-center justify-between text-muted-foreground">
              <span className="mono text-[10px] uppercase tracking-[0.18em]">
                {currentCategory} · {percent}% {t("percentCompleted", { percent })}
              </span>
              <button
                className="rounded-full p-2 transition hover:bg-secondary hover-elevate"
                onClick={() => setPanel(panel === "insight" ? "none" : "insight")}
                aria-label={t("explainWithBookMind")}
                title={t("explainWithBookMind")}
              >
                <Sparkles size={17} />
              </button>
            </div>

            <article className="serif text-[21px] leading-[1.72] sm:text-[24px]">
              <p className="mb-8 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                {content.chapter}
              </p>
              <h1 className="mb-10 max-w-xl text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl font-medium">
                {content.title}
              </h1>

              {content.paragraphs.map((para, index) => (
                <p key={index} className="mb-8">
                  {index === 0 ? (
                    <>
                      <span
                        className={`cursor-pointer transition-colors ${
                          selected
                            ? "rounded bg-[#D3A16E]/35 underline decoration-[#C7885D] decoration-2 underline-offset-4"
                            : "hover:bg-[#D3A16E]/15"
                        }`}
                        onClick={() => setSelected(!selected)}
                      >
                        {para.slice(0, 67)}
                      </span>
                      {para.slice(67)}
                    </>
                  ) : (
                    para
                  )}
                </p>
              ))}
            </article>

            {/* Pagination Controls */}
            <div className="mt-14 flex items-center justify-between border-t border-border/70 pt-6">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft size={18} /> {t("previousPage")}
              </button>

              <span className="mono text-[10px] tracking-widest text-muted-foreground">
                {t("pageIndicator", { current: page, total: totalPages })}
              </span>

              <button
                className="flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                {t("nextPage")} <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </main>

        {/* Sidebar Panel (Note or Insight) */}
        {panel !== "none" && (
          <aside className="animate-rise-in rounded-3xl border border-border bg-card/90 p-6 shadow-[var(--shadow-soft)] backdrop-blur-md lg:mt-12 h-fit">
            {panel === "note" ? (
              <NotePanel
                initialContent={currentNote?.content || ""}
                pageNumber={page}
                onSave={handleSaveNote}
                onDelete={currentNote ? handleDeleteNote : undefined}
                onClose={() => setPanel("none")}
              />
            ) : (
              <InsightPanel
                selected={selected}
                onClose={() => setPanel("none")}
              />
            )}
          </aside>
        )}
      </div>

      {/* Floating Selection Action Bar */}
      {selected && panel === "none" && (
        <div className="fixed bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-xl backdrop-blur-md animate-rise-in">
          <button
            className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition hover:bg-secondary"
            onClick={() => setPanel("note")}
          >
            <NotebookPen size={14} className="text-accent" /> {t("openNotes")}
          </button>
          <button
            className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition hover:bg-secondary"
            onClick={() => setPanel("insight")}
          >
            <Sparkles size={14} className="text-accent" /> {t("explainWithAi")}
          </button>
          <button
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            onClick={() => setSelected(false)}
          >
            <X size={14} /> {t("clearSelection")}
          </button>
        </div>
      )}
    </div>
  );
}
