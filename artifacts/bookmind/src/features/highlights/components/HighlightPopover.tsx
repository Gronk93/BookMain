import React, { useState } from "react";
import { X, Trash2, Plus, AlertCircle, NotebookPen } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  type Highlight,
  type HighlightColor,
  type HighlightCategory,
  COLOR_CONFIG,
} from "../types";

interface HighlightPopoverProps {
  highlight: Highlight;
  notes?: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
  position: { top: number; left: number };
  onUpdateColor: (color: HighlightColor) => Promise<void> | void;
  onUpdateCategory: (category: HighlightCategory | null) => Promise<void> | void;
  onAddNote: (content: string) => Promise<void> | void;
  onDeleteNote?: (noteId: string) => Promise<void> | void;
  onDeleteHighlight: () => Promise<void> | void;
  onClose: () => void;
}

export function HighlightPopover({
  highlight,
  notes = [],
  position,
  onUpdateColor,
  onUpdateCategory,
  onAddNote,
  onDeleteNote,
  onDeleteHighlight,
  onClose,
}: HighlightPopoverProps) {
  const { t } = useTranslation(["reader", "common"]);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors: HighlightColor[] = ["yellow", "green", "blue", "red", "violet"];
  const categories: Array<{ id: HighlightCategory; label: string }> = [
    { id: "important", label: t("categories.important", { defaultValue: "Importante" }) },
    { id: "learned", label: t("categories.learned", { defaultValue: "Aprendido" }) },
    { id: "example", label: t("categories.example", { defaultValue: "Ejemplo" }) },
    { id: "not_understood", label: t("categories.not_understood", { defaultValue: "No entendido" }) },
    { id: "review", label: t("categories.review", { defaultValue: "Repasar" }) },
  ];

  const handleCreateNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote("");
      setIsAddingNote(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-label={t("highlightDetails", { defaultValue: "Detalles del subrayado" })}
      className="fixed z-50 w-80 max-w-[calc(100vw-32px)] rounded-xl border border-border/80 bg-popover/95 backdrop-blur-md shadow-2xl p-4 text-popover-foreground transition-all duration-150 animate-in fade-in zoom-in-95"
      style={{
        top: `${Math.min(window.innerHeight - 380, Math.max(20, position.top + 10))}px`,
        left: `${Math.min(window.innerWidth - 340, Math.max(20, position.left - 160))}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: COLOR_CONFIG[highlight.color]?.hex || "#facc15" }}
          />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("highlight", { defaultValue: "Subrayado" })} • Pág. {highlight.pageNumber}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDeleteHighlight}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title={t("deleteHighlight", { defaultValue: "Eliminar subrayado" })}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-secondary transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Warning for Needs Review */}
      {highlight.anchorStatus === "needs_review" && (
        <div className="mb-3 rounded-md bg-amber-500/10 border border-amber-500/20 p-2.5 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle size={15} className="shrink-0 text-amber-500 mt-0.5" />
          <span>
            {t("anchorNeedsReview", {
              defaultValue:
                "El texto de la página cambió. Se requiere verificar este anclaje.",
            })}
          </span>
        </div>
      )}

      {/* Quote Preview */}
      <blockquote className="mb-3 pl-2.5 border-l-2 border-border text-xs italic text-muted-foreground line-clamp-3">
        “{highlight.exactText}”
      </blockquote>

      {/* Color Palette Switcher */}
      <div className="flex items-center justify-between mb-3 bg-secondary/30 p-2 rounded-lg">
        <span className="text-xs text-muted-foreground">
          {t("color", { defaultValue: "Color" })}:
        </span>
        <div className="flex items-center gap-1.5">
          {colors.map((c) => {
            const isSelected = highlight.color === c;
            return (
              <button
                key={c}
                onClick={() => onUpdateColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  isSelected ? "scale-120 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
                } ${COLOR_CONFIG[c].borderClass}`}
                style={{ backgroundColor: COLOR_CONFIG[c].hex }}
              />
            );
          })}
        </div>
      </div>

      {/* Category Dropdown */}
      <div className="mb-3 flex items-center justify-between">
        <label className="text-xs text-muted-foreground">
          {t("category", { defaultValue: "Categoría" })}:
        </label>
        <select
          value={highlight.category || ""}
          onChange={(e) =>
            onUpdateCategory((e.target.value as HighlightCategory) || null)
          }
          className="text-xs rounded-md border border-border/80 bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t("none", { defaultValue: "Sin categoría" })}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Attached Notes Section */}
      <div className="border-t border-border/50 pt-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <NotebookPen size={13} className="text-accent" />
            <span>
              {t("notesCount", {
                defaultValue: `Notas adjuntas (${notes.length})`,
                count: notes.length,
              })}
            </span>
          </div>
          {!isAddingNote && (
            <button
              onClick={() => setIsAddingNote(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <Plus size={12} />
              <span>{t("add", { defaultValue: "Añadir" })}</span>
            </button>
          )}
        </div>

        {/* Existing Notes list */}
        {notes.length > 0 && (
          <div className="space-y-2 mb-2 max-h-36 overflow-y-auto pr-1">
            {notes.map((n) => (
              <div
                key={n.id}
                className="group relative rounded-md bg-secondary/40 p-2 text-xs text-foreground"
              >
                <p className="whitespace-pre-wrap">{n.content}</p>
                {onDeleteNote && (
                  <button
                    onClick={() => onDeleteNote(n.id)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-opacity"
                    title={t("deleteNote", { defaultValue: "Eliminar nota" })}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Inline Note Composer */}
        {isAddingNote && (
          <div className="mt-2 space-y-2">
            <textarea
              autoFocus
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={t("writeNotePlaceholder", {
                defaultValue: "Escribe tu nota aquí...",
              })}
              className="w-full text-xs rounded-md border border-border bg-background p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[60px]"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                onClick={() => {
                  setIsAddingNote(false);
                  setNewNote("");
                }}
                className="rounded px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                {t("cancel", { defaultValue: "Cancelar" })}
              </button>
              <button
                disabled={!newNote.trim() || isSubmitting}
                onClick={handleCreateNote}
                className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting
                  ? t("saving", { defaultValue: "Guardando..." })
                  : t("save", { defaultValue: "Guardar" })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
