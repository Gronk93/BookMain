import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles, NotebookPen, X, AlertTriangle, Undo2, Check } from "lucide-react";
import {
  useGetBookDetails,
  getGetBookDetailsQueryKey,
  useGetBookPage,
  getGetBookPageQueryKey,
  useCreateBookmark,
  useDeleteBookmark,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  type Bookmark,
  type Note,
} from "@workspace/api-client-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

// Modular reader hooks
import { useReaderPreferences } from "../hooks/useReaderPreferences";
import { useReaderNavigation } from "../hooks/useReaderNavigation";
import { useReadingProgress } from "../hooks/useReadingProgress";
import { usePagePrefetch } from "../hooks/usePagePrefetch";
import { useReaderKeyboard } from "../hooks/useReaderKeyboard";
import { useTouchGestures } from "../hooks/useTouchGestures";

// BM-PRD-06: Highlights, Anchoring, Separators, and Sidebar
import {
  type Highlight,
  type HighlightColor,
  type HighlightCategory,
  COLOR_CONFIG,
} from "@/features/highlights/types";
import { usePageHighlights } from "@/features/highlights/hooks/usePageHighlights";
import { useTextSelection } from "@/features/highlights/hooks/useTextSelection";
import { SelectionToolbar } from "@/features/highlights/components/SelectionToolbar";
import { HighlightPopover } from "@/features/highlights/components/HighlightPopover";
import { useSeparators, type Separator } from "@/features/separators/hooks/useSeparators";
import { SeparatorModal } from "@/features/separators/components/SeparatorModal";
import { ReaderSidebar } from "../components/ReaderSidebar";

// Modular reader components
import { ReaderShell } from "../components/ReaderShell";
import { ReaderToolbar } from "../components/ReaderToolbar";
import { ReaderPageView } from "../components/ReaderPageView";
import { ReaderSpreadView } from "../components/ReaderSpreadView";
import { ReaderContinuousView } from "../components/ReaderContinuousView";
import { ReaderSettings } from "../components/ReaderSettings";
import { PageNavigator } from "../components/PageNavigator";
import { InsightPanel } from "../components/InsightPanel";
import { NotePanel } from "@/features/notes/components/NotePanel";
import NotFound from "@/pages/not-found";

export function ReaderPage() {
  const { bookId = "" } = useParams<{ bookId: string }>();
  const { t } = useTranslation(["reader", "common"]);
  const { user } = useAuth();
  const readerContainerRef = useRef<HTMLDivElement>(null);

  // Reader Preferences (viewMode, layout, theme, fontFamily, fontSize, lineHeight, margin, zoom)
  const { preferences, updatePreferences, resolvePageMode } = useReaderPreferences();

  // UI state
  const [panel, setPanel] = useState<"none" | "insight" | "note">("none");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedText, setSelectedText] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Highlights popover & undo state
  const [activeHighlightPopover, setActiveHighlightPopover] = useState<{
    highlight: Highlight;
    position: { top: number; left: number };
  } | null>(null);
  const [undoToast, setUndoToast] = useState<{ id: string; text: string } | null>(null);

  // Separator modal state
  const [isSeparatorModalOpen, setIsSeparatorModalOpen] = useState(false);
  const [editingSeparator, setEditingSeparator] = useState<Separator | null>(null);

  // TanStack Query for book details
  const { data: apiDetails, isLoading: isBookLoading, refetch } = useGetBookDetails(bookId, {
    query: {
      queryKey: getGetBookDetailsQueryKey(bookId),
      enabled: !!user && !!bookId,
      staleTime: 5_000,
    },
  });

  const totalPages = apiDetails?.book?.totalPages || 1;
  const initialPage = apiDetails?.progress?.currentPage || 1;

  // Reader Navigation (clamping, URL replaceState, spread page calculation)
  const {
    currentPage,
    spreadPages,
    canGoPrev,
    canGoNext,
    goToPage,
    nextPage,
    prevPage,
  } = useReaderNavigation({
    totalPages,
    initialPage,
    layout: preferences.layout,
  });

  // Debounced Reading Progress persistence (800ms, Section 26 protected)
  const { progressPercent } = useReadingProgress({
    bookId,
    currentPage,
    totalPages,
  });

  // Page prefetching (adjacent JSON + preview images)
  usePagePrefetch({
    bookId,
    currentPage,
    totalPages,
  });

  // Query page data for current page
  const { data: pageData, isLoading: isPageLoading } = useGetBookPage(bookId, currentPage, {
    query: {
      queryKey: getGetBookPageQueryKey(bookId, currentPage),
      enabled: !!user && !!bookId && currentPage > 0,
      staleTime: 60_000,
    },
  });

  // Keyboard navigation
  useReaderKeyboard({
    onNext: nextPage,
    onPrev: prevPage,
    onEscape: () => {
      setIsSettingsOpen(false);
      setIsNavigatorOpen(false);
      setIsSidebarOpen(false);
      setActiveHighlightPopover(null);
      setPanel("none");
    },
    enabled: !isSettingsOpen && !isNavigatorOpen && !isSidebarOpen,
  });

  // Touch gesture swipe navigation
  useTouchGestures({
    onSwipeLeft: nextPage,
    onSwipeRight: prevPage,
  });

  // Text selection tracking inside reading surface
  const { selectionData, clearSelection } = useTextSelection(readerContainerRef);

  // BM-PRD-06: Highlights hooks
  const {
    highlights,
    createHighlight,
    updateHighlight,
    deleteHighlight,
    restoreHighlight,
  } = usePageHighlights(bookId);

  // BM-PRD-06: Separators hooks
  const {
    separators,
    createSeparator,
    updateSeparator,
    deleteSeparator,
  } = useSeparators(bookId);

  // Local bookmarks & notes state
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[]>([]);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (apiDetails) {
      if (apiDetails.bookmarks) setLocalBookmarks(apiDetails.bookmarks);
      if (apiDetails.notes) setLocalNotes(apiDetails.notes);
    }
  }, [apiDetails]);

  // Mutations
  const createBookmarkMutation = useCreateBookmark();
  const deleteBookmarkMutation = useDeleteBookmark();
  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

  // Active bookmark & note for current page
  const currentBookmark = localBookmarks.find((bm) => bm.pageNumber === currentPage);
  const isBookmarked = !!currentBookmark;
  const currentNote = localNotes.find((n) => n.pageNumber === currentPage);

  // Bookmark toggle handler
  const handleToggleBookmark = async () => {
    if (isBookmarked && currentBookmark) {
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
      const tempId = `temp-${Date.now()}`;
      const newBm: Bookmark = {
        id: tempId,
        bookId,
        pageNumber: currentPage,
        title: `Página ${currentPage}`,
        createdAt: new Date().toISOString(),
      };
      setLocalBookmarks((prev) => [...prev, newBm]);
      if (user && bookId) {
        try {
          const created = await createBookmarkMutation.mutateAsync({
            bookId,
            data: { pageNumber: currentPage, title: `Página ${currentPage}` },
          });
          setLocalBookmarks((prev) => prev.map((b) => (b.id === tempId ? created : b)));
        } catch {
          refetch();
        }
      }
    }
  };

  // Note save handler (Page note)
  const handleSaveNote = async (text: string) => {
    if (!text.trim()) return;

    if (currentNote) {
      const updatedNote: Note = {
        ...currentNote,
        content: text,
        updatedAt: new Date().toISOString(),
      };
      setLocalNotes((prev) => prev.map((n) => (n.id === currentNote.id ? updatedNote : n)));
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
      const tempId = `temp-${Date.now()}`;
      const newNote: Note = {
        id: tempId,
        bookId,
        pageNumber: currentPage,
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
            data: { pageNumber: currentPage, content: text, color: "amber" },
          });
          setLocalNotes((prev) => prev.map((n) => (n.id === tempId ? created : n)));
        } catch {
          refetch();
        }
      }
    }
  };

  // Note delete handler
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

  // Highlight creation handlers from selection toolbar
  const handleToolbarHighlight = async (color: HighlightColor) => {
    if (!selectionData) return;
    try {
      await createHighlight({
        pageNumber: selectionData.pageNumber,
        startBlockId: selectionData.startBlockId,
        startOffset: selectionData.startOffset,
        endBlockId: selectionData.endBlockId,
        endOffset: selectionData.endOffset,
        exactText: selectionData.exactText,
        prefixText: selectionData.prefixText,
        suffixText: selectionData.suffixText,
        color,
        category: COLOR_CONFIG[color]?.category || "important",
        boundingBoxes: selectionData.boundingBoxes,
      });
    } finally {
      clearSelection();
    }
  };

  const handleToolbarAddNote = async (color: HighlightColor) => {
    if (!selectionData) return;
    try {
      const created = await createHighlight({
        pageNumber: selectionData.pageNumber,
        startBlockId: selectionData.startBlockId,
        startOffset: selectionData.startOffset,
        endBlockId: selectionData.endBlockId,
        endOffset: selectionData.endOffset,
        exactText: selectionData.exactText,
        prefixText: selectionData.prefixText,
        suffixText: selectionData.suffixText,
        color,
        category: COLOR_CONFIG[color]?.category || "important",
        boundingBoxes: selectionData.boundingBoxes,
      });
      clearSelection();
      if (created) {
        setActiveHighlightPopover({
          highlight: created,
          position: { top: selectionData.position.top, left: selectionData.position.left },
        });
      }
    } catch {
      clearSelection();
    }
  };

  // Click on existing highlight opens popover
  const handleHighlightClick = (hl: Highlight, e: React.MouseEvent) => {
    clearSelection();
    setActiveHighlightPopover({
      highlight: hl,
      position: { top: e.clientY, left: e.clientX },
    });
  };

  // Delete highlight with undo snackbar
  const handleDeleteHighlight = async () => {
    if (!activeHighlightPopover) return;
    const hlId = activeHighlightPopover.highlight.id;
    const hlText = activeHighlightPopover.highlight.exactText;

    await deleteHighlight(hlId);
    setActiveHighlightPopover(null);

    setUndoToast({ id: hlId, text: hlText });
    setTimeout(() => {
      setUndoToast((prev) => (prev?.id === hlId ? null : prev));
    }, 6000);
  };

  // Undo delete
  const handleUndoHighlight = async () => {
    if (undoToast) {
      await restoreHighlight(undoToast.id);
      setUndoToast(null);
    }
  };

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Effective page mode for current page
  const effectiveMode = resolvePageMode(pageData ?? undefined);

  // Switch to original view mode
  const handleSwitchToOriginal = useCallback(() => {
    updatePreferences({ viewMode: "original" });
  }, [updatePreferences]);

  const bookTitle = apiDetails?.book?.title || t("bookTitleDefault", { defaultValue: "Libro" });

  if (isBookLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // 404 handler
  if (!apiDetails?.book) {
    return <NotFound />;
  }

  const isOverlayOpen =
    isSettingsOpen ||
    isNavigatorOpen ||
    isSidebarOpen ||
    isSeparatorModalOpen ||
    panel !== "none";

  // Attached notes for current popover
  const popoverNotes = activeHighlightPopover
    ? localNotes
        .filter((n) => (n as any).highlightId === activeHighlightPopover.highlight.id)
        .map((n) => ({
          id: n.id,
          content: n.content,
          createdAt: n.createdAt,
        }))
    : [];

  return (
    <ReaderShell
      theme={preferences.theme}
      showControls={showControls}
      onShowControlsChange={setShowControls}
      isOverlayOpen={isOverlayOpen}
      className="select-none"
    >
      {/* Top and Bottom Toolbars */}
      <ReaderToolbar
        bookTitle={bookTitle}
        currentPage={currentPage}
        totalPages={totalPages}
        progressPercent={progressPercent}
        preferences={preferences}
        onUpdatePreferences={updatePreferences}
        isBookmarked={isBookmarked}
        onToggleBookmark={handleToggleBookmark}
        activePanel={panel}
        onToggleNote={() => setPanel(panel === "note" ? "none" : "note")}
        onToggleInsight={() => setPanel(panel === "insight" ? "none" : "insight")}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNavigator={() => setIsNavigatorOpen(true)}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        canPrevPage={canGoPrev}
        canNextPage={canGoNext}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showControls={showControls}
        effectiveMode={effectiveMode}
      />

      {/* Main Reading Surface Container */}
      <main
        ref={readerContainerRef}
        className="flex-1 w-full pt-16 pb-16 min-h-screen flex items-center justify-center relative select-text"
        data-page-background="true"
        onClick={() => {
          if (activeHighlightPopover) setActiveHighlightPopover(null);
        }}
      >
        {/* Book processing in progress screen */}
        {apiDetails?.book?.processingStatus === "processing" && !pageData?.textContent ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-rise-in px-4">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="font-serif text-2xl font-medium mb-2">
              {t("preparingBook", { defaultValue: "Preparando libro..." })}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground mb-6">
              {t("preparingBookDesc", {
                defaultValue: "BookMind está procesando y extrayendo las páginas de este libro.",
              })}
            </p>
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary animate-pulse" style={{ width: "65%" }} />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex justify-center items-center">
            {/* 1. Continuous scroll layout */}
            {preferences.layout === "continuous" && (
              <ReaderContinuousView
                bookId={bookId}
                currentPage={currentPage}
                totalPages={totalPages}
                preferences={preferences}
                resolvePageMode={resolvePageMode}
                highlights={highlights}
                onHighlightClick={handleHighlightClick}
                onPageVisible={(visiblePage) => goToPage(visiblePage)}
                onSwitchToOriginal={handleSwitchToOriginal}
              />
            )}

            {/* 2. Double spread layout */}
            {preferences.layout === "double" && (
              <ReaderSpreadView
                bookId={bookId}
                leftPageNumber={spreadPages.left}
                rightPageNumber={spreadPages.right}
                leftPageData={pageData}
                preferences={preferences}
                resolvePageMode={resolvePageMode}
                highlights={highlights}
                onHighlightClick={handleHighlightClick}
                onSwitchToOriginal={handleSwitchToOriginal}
              />
            )}

            {/* 3. Single page layout */}
            {preferences.layout === "single" && (
              <div className="w-full max-w-4xl px-4 py-2">
                <ReaderPageView
                  bookId={bookId}
                  pageNumber={currentPage}
                  pageData={pageData}
                  effectiveMode={effectiveMode}
                  preferences={preferences}
                  highlights={highlights.filter((h) => h.pageNumber === currentPage)}
                  onHighlightClick={handleHighlightClick}
                  onSwitchToOriginal={handleSwitchToOriginal}
                />
              </div>
            )}
          </div>
        )}

        {/* Side Panels (Quick Page Notes or AI Insight) */}
        {panel !== "none" && (
          <aside className="fixed right-4 bottom-16 top-16 z-30 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-md overflow-y-auto animate-in slide-in-from-right duration-200">
            {panel === "note" ? (
              <NotePanel
                initialContent={currentNote?.content || ""}
                pageNumber={currentPage}
                onSave={handleSaveNote}
                onDelete={currentNote ? handleDeleteNote : undefined}
                onClose={() => setPanel("none")}
              />
            ) : (
              <InsightPanel
                selected={selectedText}
                onClose={() => setPanel("none")}
              />
            )}
          </aside>
        )}
      </main>

      {/* Floating Selection Toolbar (appears on text selection) */}
      {selectionData && !activeHighlightPopover && (
        <SelectionToolbar
          selection={selectionData}
          onHighlight={handleToolbarHighlight}
          onAddNote={handleToolbarAddNote}
          onClose={clearSelection}
        />
      )}

      {/* Highlight Details & Notes Popover */}
      {activeHighlightPopover && (
        <HighlightPopover
          highlight={activeHighlightPopover.highlight}
          notes={popoverNotes}
          position={activeHighlightPopover.position}
          onUpdateColor={async (color) => {
            await updateHighlight({
              highlightId: activeHighlightPopover.highlight.id,
              color,
            });
            setActiveHighlightPopover((prev) =>
              prev ? { ...prev, highlight: { ...prev.highlight, color } } : null,
            );
          }}
          onUpdateCategory={async (category) => {
            await updateHighlight({
              highlightId: activeHighlightPopover.highlight.id,
              category,
            });
            setActiveHighlightPopover((prev) =>
              prev ? { ...prev, highlight: { ...prev.highlight, category } } : null,
            );
          }}
          onAddNote={async (content) => {
            const res = await createNoteMutation.mutateAsync({
              bookId,
              data: {
                pageNumber: activeHighlightPopover.highlight.pageNumber,
                content,
                color: activeHighlightPopover.highlight.color,
                highlightId: activeHighlightPopover.highlight.id,
                highlightText: activeHighlightPopover.highlight.exactText,
              } as any,
            });
            setLocalNotes((prev) => [...prev, res]);
          }}
          onDeleteNote={async (noteId) => {
            setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
            await deleteNoteMutation.mutateAsync({ bookId, noteId });
          }}
          onDeleteHighlight={handleDeleteHighlight}
          onClose={() => setActiveHighlightPopover(null)}
        />
      )}

      {/* Comprehensive Reader Sidebar (Notes, Bookmarks, Separators) */}
      <ReaderSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentPage={currentPage}
        totalPages={totalPages}
        bookmarks={localBookmarks}
        highlights={highlights}
        notes={localNotes}
        separators={separators}
        onGoToPage={(p) => {
          goToPage(p);
          setIsSidebarOpen(false);
        }}
        onDeleteBookmark={async (bmId) => {
          setLocalBookmarks((prev) => prev.filter((b) => b.id !== bmId));
          await deleteBookmarkMutation.mutateAsync({ bookId, bookmarkId: bmId });
        }}
        onOpenSeparatorModal={(sep) => {
          setEditingSeparator(sep || null);
          setIsSeparatorModalOpen(true);
        }}
        onDeleteHighlight={async (hlId) => {
          await deleteHighlight(hlId);
        }}
        onDeleteNote={async (noteId) => {
          setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
          await deleteNoteMutation.mutateAsync({ bookId, noteId });
        }}
      />

      {/* Separator Modal (Create/Edit Reading Range) */}
      <SeparatorModal
        isOpen={isSeparatorModalOpen}
        onClose={() => {
          setIsSeparatorModalOpen(false);
          setEditingSeparator(null);
        }}
        totalPages={totalPages}
        currentPage={currentPage}
        initialSeparator={editingSeparator}
        onSave={async (data) => {
          if (editingSeparator) {
            await updateSeparator({ id: editingSeparator.id, ...data });
          } else {
            await createSeparator(data);
          }
        }}
        onDelete={async (id) => {
          await deleteSeparator(id);
        }}
      />

      {/* Undo Deleted Highlight Toast */}
      {undoToast && (
        <div className="fixed bottom-16 right-4 z-50 flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <span className="text-xs text-foreground font-medium">
            Subrayado eliminado
          </span>
          <button
            onClick={handleUndoHighlight}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-xs font-semibold transition-colors"
          >
            <Undo2 size={13} />
            <span>Deshacer</span>
          </button>
          <button
            onClick={() => setUndoToast(null)}
            className="rounded p-1 text-muted-foreground hover:bg-secondary"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Settings Side Drawer */}
      <ReaderSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        onUpdatePreferences={updatePreferences}
      />

      {/* Direct Page Navigator Scrubber Modal */}
      <PageNavigator
        isOpen={isNavigatorOpen}
        onClose={() => setIsNavigatorOpen(false)}
        currentPage={currentPage}
        totalPages={totalPages}
        onGoToPage={goToPage}
      />
    </ReaderShell>
  );
}
