import React from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sliders,
  NotebookPen,
  Sparkles,
  Maximize2,
  Minimize2,
  FileText,
  Image as ImageIcon,
  Compass,
  Layers,
} from "lucide-react";
import { BookmarkButton } from "@/features/bookmarks/components/BookmarkButton";
import { ZoomControls } from "./ZoomControls";
import {
  type ReaderPreferences,
  type ReaderViewMode,
  type ReaderLayout,
} from "../hooks/useReaderPreferences";

interface ReaderToolbarProps {
  bookTitle: string;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  preferences: ReaderPreferences;
  onUpdatePreferences: (updates: Partial<ReaderPreferences>) => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  activePanel: "none" | "note" | "insight";
  onToggleNote: () => void;
  onToggleInsight: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  onOpenSettings: () => void;
  onOpenNavigator: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  canPrevPage: boolean;
  canNextPage: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showControls: boolean;
  effectiveMode: "reading" | "original";
}

export function ReaderToolbar({
  bookTitle,
  currentPage,
  totalPages,
  progressPercent,
  preferences,
  onUpdatePreferences,
  isBookmarked,
  onToggleBookmark,
  activePanel,
  onToggleNote,
  onToggleInsight,
  onToggleSidebar,
  isSidebarOpen,
  onOpenSettings,
  onOpenNavigator,
  onPrevPage,
  onNextPage,
  canPrevPage,
  canNextPage,
  isFullscreen,
  onToggleFullscreen,
  showControls,
  effectiveMode,
}: ReaderToolbarProps) {
  const { t } = useTranslation(["reader", "common"]);

  const transitionClass = "transition-all duration-300 ease-in-out";
  const visibilityClass = showControls
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 -translate-y-4 pointer-events-none";
  const bottomVisibilityClass = showControls
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 translate-y-4 pointer-events-none";

  return (
    <>
      {/* Top Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-md border-b border-border/40 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-xs ${transitionClass} ${visibilityClass}`}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/50 shrink-0"
            title={t("backToLibrary", { defaultValue: "Volver a la biblioteca" })}
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline font-medium">
              {t("backToLibrary", { defaultValue: "Biblioteca" })}
            </span>
          </Link>

          <div className="h-4 w-px bg-border/40 hidden sm:block" />

          <h1 className="font-serif text-sm font-medium text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {bookTitle}
          </h1>
        </div>

        {/* Center: View Mode Switcher (Auto / Reading / Original) */}
        <div className="hidden lg:flex items-center rounded-xl border border-border/60 bg-muted/40 p-0.5 text-xs">
          <button
            onClick={() => onUpdatePreferences({ viewMode: "auto" })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all text-xs ${
              preferences.viewMode === "auto"
                ? "bg-card shadow-xs font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Modo Automático: Lectura para PDFs digitales, Original para escaneados"
          >
            <Compass size={12} />
            <span>{t("modeAuto", { defaultValue: "Auto" })}</span>
          </button>
          <button
            onClick={() => onUpdatePreferences({ viewMode: "reading" })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all text-xs ${
              preferences.viewMode === "reading"
                ? "bg-card shadow-xs font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Modo Lectura: Texto reflow editorial"
          >
            <FileText size={12} />
            <span>{t("modeReading", { defaultValue: "Lectura" })}</span>
          </button>
          <button
            onClick={() => onUpdatePreferences({ viewMode: "original" })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all text-xs ${
              preferences.viewMode === "original"
                ? "bg-card shadow-xs font-medium text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Modo Original: Vista fiel de la página del PDF"
          >
            <ImageIcon size={12} />
            <span>{t("modeOriginal", { defaultValue: "Original" })}</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Zoom controls (visible in Original mode) */}
          {effectiveMode === "original" && (
            <div className="hidden md:flex items-center mr-1">
              <ZoomControls
                zoom={preferences.zoom}
                onZoomChange={(zoom) => onUpdatePreferences({ zoom })}
              />
            </div>
          )}

          {/* Bookmark Button */}
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={onToggleBookmark}
          />

          {/* Notes & Annotations Sidebar Toggle */}
          <button
            onClick={onToggleSidebar || onToggleNote}
            className={`rounded-full p-2 transition-colors ${
              isSidebarOpen || activePanel === "note"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={t("notesAndSidebar", { defaultValue: "Notas, marcadores y separadores" })}
            aria-label={t("notesAndSidebar", { defaultValue: "Notas, marcadores y separadores" })}
          >
            <NotebookPen size={16} />
          </button>

          {/* AI Insights Toggle */}
          <button
            onClick={onToggleInsight}
            className={`rounded-full p-2 transition-colors ${
              activePanel === "insight"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={t("explainWithBookMind", { defaultValue: "BookMind AI" })}
            aria-label={t("explainWithBookMind", { defaultValue: "BookMind AI" })}
          >
            <Sparkles size={16} />
          </button>

          {/* Reader Settings Toggle */}
          <button
            onClick={onOpenSettings}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={t("readerSettings", { defaultValue: "Ajustes de lectura" })}
            aria-label={t("readerSettings", { defaultValue: "Ajustes de lectura" })}
          >
            <Sliders size={16} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors hidden sm:inline-flex"
            title={isFullscreen ? t("exitFullscreen", { defaultValue: "Salir de pantalla completa" }) : t("fullscreen", { defaultValue: "Pantalla completa" })}
            aria-label={t("fullscreen", { defaultValue: "Pantalla completa" })}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Bottom Bar */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-md border-t border-border/40 px-3 sm:px-6 py-2 shadow-sm ${transitionClass} ${bottomVisibilityClass}`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Previous Page */}
          <button
            onClick={onPrevPage}
            disabled={!canPrevPage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">{t("previousPage", { defaultValue: "Anterior" })}</span>
          </button>

          {/* Scrubber / Page Navigator Jump */}
          <button
            onClick={onOpenNavigator}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted border border-border/40 text-xs font-mono transition-colors"
            title={t("goToPage", { defaultValue: "Ir a página" })}
          >
            <span className="font-semibold text-foreground">
              {currentPage} / {totalPages || 1}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{progressPercent}%</span>
          </button>

          {/* Layout Quick Selector (Single, Double, Continuous) */}
          <div className="hidden sm:flex items-center rounded-lg border border-border/40 bg-muted/30 p-0.5 text-[11px]">
            {(["single", "double", "continuous"] as ReaderLayout[]).map((layout) => (
              <button
                key={layout}
                onClick={() => onUpdatePreferences({ layout })}
                className={`px-2 py-0.5 rounded transition-colors ${
                  preferences.layout === layout
                    ? "bg-card shadow-2xs font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {layout === "single" && "1 Pág"}
                {layout === "double" && "2 Págs"}
                {layout === "continuous" && "Continua"}
              </button>
            ))}
          </div>

          {/* Next Page */}
          <button
            onClick={onNextPage}
            disabled={!canNextPage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <span className="hidden sm:inline">{t("nextPage", { defaultValue: "Siguiente" })}</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Thin bottom progress line */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/40 overflow-hidden">
          <div
            className="h-full bg-primary/70 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </footer>
    </>
  );
}
