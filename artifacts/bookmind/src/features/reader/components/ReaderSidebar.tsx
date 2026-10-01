import React, { useState, useMemo } from "react";
import {
  X,
  NotebookPen,
  Bookmark as BookmarkIcon,
  BookmarkCheck,
  Search,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Filter,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Bookmark, type Note } from "@workspace/api-client-react";
import { type Highlight, type HighlightCategory, type HighlightColor, COLOR_CONFIG } from "@/features/highlights/types";
import { type Separator } from "@/features/separators/hooks/useSeparators";

interface ReaderSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  totalPages: number;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  notes: Note[];
  separators: Separator[];
  onGoToPage: (pageNumber: number) => void;
  onDeleteBookmark: (bookmarkId: string) => void;
  onOpenSeparatorModal: (separator?: Separator) => void;
  onDeleteHighlight?: (highlightId: string) => void;
  onDeleteNote?: (noteId: string) => void;
}

type TabType = "notes" | "bookmarks" | "separators";

export function ReaderSidebar({
  isOpen,
  onClose,
  currentPage,
  totalPages,
  bookmarks = [],
  highlights = [],
  notes = [],
  separators = [],
  onGoToPage,
  onDeleteBookmark,
  onOpenSeparatorModal,
  onDeleteHighlight,
  onDeleteNote,
}: ReaderSidebarProps) {
  const { t } = useTranslation(["reader", "common"]);
  const [activeTab, setActiveTab] = useState<TabType>("notes");

  // Filters for notes tab
  const [scope, setScope] = useState<"page" | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedColor, setSelectedColor] = useState<HighlightColor | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState<HighlightCategory | "all">("all");

  // Filtered highlights & notes
  const filteredHighlights = useMemo(() => {
    return highlights.filter((h) => {
      if (scope === "page" && h.pageNumber !== currentPage) return false;
      if (selectedColor !== "all" && h.color !== selectedColor) return false;
      if (selectedCategory !== "all" && h.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return h.exactText.toLowerCase().includes(q);
      }
      return true;
    });
  }, [highlights, scope, currentPage, selectedColor, selectedCategory, searchQuery]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (scope === "page" && n.pageNumber !== currentPage) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (n.content || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [notes, scope, currentPage, searchQuery]);

  if (!isOpen) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 w-96 max-w-[calc(100vw-1rem)] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      aria-label="Panel lateral del lector"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "notes"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <NotebookPen size={14} />
            <span>{t("notesAndHighlights", { defaultValue: "Notas" })}</span>
            <span className="text-[10px] opacity-60">({highlights.length + notes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "bookmarks"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookmarkIcon size={14} />
            <span>{t("bookmarks", { defaultValue: "Marcadores" })}</span>
            <span className="text-[10px] opacity-60">({bookmarks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("separators")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === "separators"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookmarkCheck size={14} />
            <span>{t("separators", { defaultValue: "Separadores" })}</span>
            <span className="text-[10px] opacity-60">({separators.length})</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ml-2"
        >
          <X size={18} />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ================= TAB 1: NOTES & HIGHLIGHTS ================= */}
        {activeTab === "notes" && (
          <div className="space-y-4">
            {/* Filter controls */}
            <div className="space-y-2.5 bg-secondary/30 p-3 rounded-xl border border-border/40">
              {/* Search bar */}
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("searchNotesPlaceholder", { defaultValue: "Buscar en notas y citas..." })}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Scope filter */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border/40">
                  <button
                    onClick={() => setScope("all")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      scope === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("allBook", { defaultValue: "Todo el libro" })}
                  </button>
                  <button
                    onClick={() => setScope("page")}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      scope === "page" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("thisPage", { defaultValue: `Página actual (${currentPage})` })}
                  </button>
                </div>

                {/* Color filter */}
                <div className="flex items-center gap-1">
                  {(["yellow", "green", "blue", "red", "violet"] as HighlightColor[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedColor(selectedColor === c ? "all" : c)}
                      className={`size-4 rounded-full border transition-all ${
                        selectedColor === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: COLOR_CONFIG[c].hex }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Highlights List */}
            {filteredHighlights.length === 0 && filteredNotes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs italic">
                {t("noNotesOrHighlightsFound", { defaultValue: "No se encontraron subrayados ni notas." })}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Highlights */}
                {filteredHighlights.map((hl) => {
                  const cfg = COLOR_CONFIG[hl.color] || COLOR_CONFIG.yellow;
                  return (
                    <div
                      key={hl.id}
                      onClick={() => onGoToPage(hl.pageNumber)}
                      className="group p-3 rounded-xl border border-border/60 bg-card hover:border-primary/50 transition-all cursor-pointer space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: cfg.hex }} />
                          <span className="font-semibold text-foreground">Pág. {hl.pageNumber}</span>
                          {hl.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              {hl.category}
                            </span>
                          )}
                          {hl.anchorStatus === "needs_review" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 font-medium">
                              Revisión
                            </span>
                          )}
                        </div>
                        {onDeleteHighlight && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteHighlight(hl.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-opacity"
                            title={t("delete", { defaultValue: "Eliminar" })}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90 italic line-clamp-2 pl-2 border-l-2 border-primary/40">
                        “{hl.exactText}”
                      </p>
                    </div>
                  );
                })}

                {/* Unanchored Page Notes */}
                {filteredNotes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onGoToPage(n.pageNumber)}
                    className="group p-3 rounded-xl border border-border/60 bg-card hover:border-primary/50 transition-all cursor-pointer space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <NotebookPen size={12} className="text-accent" />
                        <span className="font-semibold text-foreground">Pág. {n.pageNumber}</span>
                        <span className="text-[10px] text-muted-foreground">Nota de página</span>
                      </div>
                      {onDeleteNote && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(n.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-opacity"
                          title={t("delete", { defaultValue: "Eliminar" })}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-3">
                      {n.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: BOOKMARKS ================= */}
        {activeTab === "bookmarks" && (
          <div className="space-y-3">
            {bookmarks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs italic">
                {t("noBookmarks", { defaultValue: "No tienes marcadores guardados." })}
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  onClick={() => onGoToPage(bm.pageNumber)}
                  className="group flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card hover:border-primary/50 transition-all cursor-pointer shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <BookmarkIcon size={16} className="text-primary fill-primary" />
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{bm.title || `Página ${bm.pageNumber}`}</h4>
                      <span className="text-[10px] text-muted-foreground">
                        Página {bm.pageNumber}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBookmark(bm.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-opacity"
                    title={t("deleteBookmark", { defaultValue: "Eliminar marcador" })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ================= TAB 3: SEPARATORS ================= */}
        {activeTab === "separators" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {separators.length} {separators.length === 1 ? "separador" : "separadores"}
              </span>
              <button
                onClick={() => onOpenSeparatorModal()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-xs font-medium transition-colors"
              >
                <Plus size={14} />
                <span>{t("newSeparator", { defaultValue: "Nuevo separador" })}</span>
              </button>
            </div>

            {separators.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-xs italic">
                {t("noSeparators", { defaultValue: "No hay separadores definidos en este libro." })}
              </div>
            ) : (
              <div className="space-y-3">
                {separators.map((sep) => {
                  const rangeTotal = Math.max(1, sep.endPage - sep.startPage + 1);
                  const pagesCompleted = Math.max(0, Math.min(rangeTotal, currentPage - sep.startPage + 1));
                  const percent = Math.min(100, Math.max(0, Math.round((pagesCompleted / rangeTotal) * 100)));
                  const isCurrentInRange = currentPage >= sep.startPage && currentPage <= sep.endPage;

                  return (
                    <div
                      key={sep.id}
                      className={`p-3.5 rounded-xl border bg-card transition-all space-y-2.5 shadow-xs ${
                        isCurrentInRange ? "border-primary ring-1 ring-primary/20" : "border-border/60 hover:border-border"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <BookmarkCheck size={14} className="text-primary shrink-0" />
                            <span>{sep.title}</span>
                          </h4>
                          <span className="text-[11px] text-muted-foreground">
                            Páginas {sep.startPage} – {sep.endPage} ({rangeTotal} págs)
                          </span>
                        </div>
                        <button
                          onClick={() => onOpenSeparatorModal(sep)}
                          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title={t("edit", { defaultValue: "Editar" })}
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>Progreso del bloque</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Jump button */}
                      <div className="flex items-center justify-end pt-1">
                        <button
                          onClick={() => onGoToPage(sep.startPage)}
                          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
                        >
                          <span>Ir al inicio (pág. {sep.startPage})</span>
                          <ExternalLink size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
