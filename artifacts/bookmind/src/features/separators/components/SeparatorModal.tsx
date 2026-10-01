import React, { useState, useEffect } from "react";
import { X, BookmarkCheck, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Separator } from "../hooks/useSeparators";

interface SeparatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage?: number;
  initialSeparator?: Separator | null;
  onSave: (data: {
    title: string;
    startPage: number;
    endPage: number;
    color?: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const COLOR_OPTIONS = [
  { id: "amber", hex: "#f59e0b", label: "Ámbar" },
  { id: "blue", hex: "#3b82f6", label: "Azul" },
  { id: "emerald", hex: "#10b981", label: "Verde" },
  { id: "rose", hex: "#f43f5e", label: "Rosa" },
  { id: "violet", hex: "#8b5cf6", label: "Violeta" },
];

export function SeparatorModal({
  isOpen,
  onClose,
  totalPages,
  currentPage = 1,
  initialSeparator,
  onSave,
  onDelete,
}: SeparatorModalProps) {
  const { t } = useTranslation(["reader", "common"]);

  const [title, setTitle] = useState("");
  const [startPage, setStartPage] = useState(currentPage);
  const [endPage, setEndPage] = useState(Math.min(currentPage + 10, totalPages));
  const [color, setColor] = useState("amber");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSeparator) {
      setTitle(initialSeparator.title);
      setStartPage(initialSeparator.startPage);
      setEndPage(initialSeparator.endPage);
      setColor(initialSeparator.color || "amber");
    } else {
      setTitle("");
      setStartPage(currentPage);
      setEndPage(Math.min(currentPage + 10, totalPages));
      setColor("amber");
    }
    setError(null);
  }, [initialSeparator, currentPage, totalPages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t("separatorTitleRequired", { defaultValue: "El título es obligatorio." }));
      return;
    }

    if (startPage < 1 || startPage > totalPages) {
      setError(
        t("separatorStartInvalid", {
          defaultValue: `La página inicial debe estar entre 1 y ${totalPages}.`,
          total: totalPages,
        }),
      );
      return;
    }

    if (endPage < startPage || endPage > totalPages) {
      setError(
        t("separatorEndInvalid", {
          defaultValue: `La página final debe ser mayor o igual a la inicial y menor o igual a ${totalPages}.`,
          total: totalPages,
        }),
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        title: trimmedTitle,
        startPage,
        endPage,
        color,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Error al guardar el separador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialSeparator || !onDelete) return;
    if (confirm(t("confirmDeleteSeparator", { defaultValue: "¿Deseas eliminar este separador?" }))) {
      setIsSubmitting(true);
      try {
        await onDelete(initialSeparator.id);
        onClose();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="size-5 text-primary" />
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {initialSeparator
                ? t("editSeparator", { defaultValue: "Editar separador" })
                : t("newSeparator", { defaultValue: "Nuevo separador" })}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {t("separatorTitle", { defaultValue: "Nombre o descripción" })}
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("separatorPlaceholder", {
                defaultValue: "Ej. Módulo 3, Semana 2, Lectura obligatoria...",
              })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("startPage", { defaultValue: "Desde página" })}
              </label>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={startPage}
                onChange={(e) => setStartPage(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                {t("endPage", { defaultValue: "Hasta página" })}
              </label>
              <input
                type="number"
                min={startPage}
                max={totalPages}
                value={endPage}
                onChange={(e) => setEndPage(parseInt(e.target.value, 10) || startPage)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Color selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              {t("color", { defaultValue: "Color de referencia" })}
            </label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`size-6 rounded-full border-2 transition-all ${
                    color === c.id
                      ? "ring-2 ring-primary ring-offset-2 scale-110"
                      : "opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.hex, borderColor: "transparent" }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border/40">
            {initialSeparator && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={14} />
                <span>{t("delete", { defaultValue: "Eliminar" })}</span>
              </button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                {t("cancel", { defaultValue: "Cancelar" })}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isSubmitting
                  ? t("saving", { defaultValue: "Guardando..." })
                  : t("save", { defaultValue: "Guardar" })}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
