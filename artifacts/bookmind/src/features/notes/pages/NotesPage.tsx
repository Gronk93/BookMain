import React, { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  NotebookPen,
  Search,
  BookOpen,
  Calendar,
  ExternalLink,
  Trash2,
  Filter,
} from "lucide-react";
import { useGetBooks } from "@workspace/api-client-react";
import { COLOR_CONFIG, type HighlightColor } from "@/features/highlights/types";

interface GlobalNoteItem {
  id: string;
  userId: string;
  bookId: string;
  bookTitle?: string;
  pageNumber: number;
  highlightId?: string | null;
  highlightText?: string | null;
  content: string;
  color?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GlobalNotesResponse {
  notes: GlobalNoteItem[];
  total: number;
  page: number;
  limit: number;
}

export function NotesPage() {
  const { t } = useTranslation(["reader", "common"]);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch user's books for the filter dropdown
  const { data: books = [] } = useGetBooks();

  // Query global notes
  const queryKey = ["notes", "global", { bookId: selectedBookId, search, page, limit }];
  const { data, isLoading } = useQuery<GlobalNotesResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBookId !== "all") params.set("bookId", selectedBookId);
      if (search.trim()) params.set("search", search.trim());
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
  });

  const notes = data?.notes || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ bookId, noteId }: { bookId: string; noteId: string }) => {
      const res = await fetch(`/api/books/${bookId}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete note");
      return noteId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });

  const handleDelete = async (bookId: string, noteId: string) => {
    if (confirm(t("confirmDeleteNote", { defaultValue: "¿Deseas eliminar esta nota?" }))) {
      await deleteMutation.mutateAsync({ bookId, noteId });
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <NotebookPen className="size-7 text-primary" />
            <span>{t("allNotes", { defaultValue: "Notas y Citas" })}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("allNotesSubtitle", {
              defaultValue: "Explora todas tus reflexiones, citas y subrayados en tu biblioteca.",
            })}
          </p>
        </div>

        <div className="text-xs text-muted-foreground font-mono">
          {total} {total === 1 ? "nota" : "notas"} en total
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <Search size={15} className="absolute left-3 top-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchNotesPlaceholder", {
              defaultValue: "Buscar por contenido o texto subrayado...",
            })}
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
          />
        </div>

        {/* Book Selector */}
        <div className="relative">
          <select
            value={selectedBookId}
            onChange={(e) => {
              setSelectedBookId(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
          >
            <option value="all">{t("allBooks", { defaultValue: "Todos los libros" })}</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notes List */}
      <div className="mt-8 space-y-4">
        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : notes.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-dashed border-border/70 p-8">
            <NotebookPen className="mx-auto size-10 text-muted-foreground/40 mb-3" />
            <h3 className="font-serif text-lg font-medium text-foreground">
              {t("noNotesFound", { defaultValue: "No se encontraron notas" })}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {search || selectedBookId !== "all"
                ? t("noNotesFiltered", {
                    defaultValue: "Prueba a cambiar los filtros o el término de búsqueda.",
                  })
                : t("noNotesYet", {
                    defaultValue:
                      "Selecciona texto en cualquier libro mientras lees para crear tu primera nota o subrayado.",
                  })}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((note) => {
              const cfg = note.color ? COLOR_CONFIG[note.color as HighlightColor] : null;
              const formattedDate = new Date(note.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={note.id}
                  className="group rounded-2xl border border-border bg-card p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Book Title & Page badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpen size={14} className="text-primary shrink-0" />
                        <span className="text-xs font-semibold text-foreground truncate">
                          {note.bookTitle || "Libro"}
                        </span>
                      </div>
                      <span className="shrink-0 text-[11px] font-mono font-medium rounded-full bg-secondary px-2.5 py-0.5 text-muted-foreground">
                        Pág. {note.pageNumber}
                      </span>
                    </div>

                    {/* Anchored Quote (if highlight exists) */}
                    {note.highlightText && (
                      <blockquote
                        className={`text-xs italic pl-3 border-l-3 rounded-r-md py-1 pr-2 ${
                          cfg ? cfg.bgClass : "bg-muted/30"
                        } text-foreground/90`}
                        style={{
                          borderLeftColor: cfg ? cfg.hex : "var(--color-primary)",
                        }}
                      >
                        “{note.highlightText}”
                      </blockquote>
                    )}

                    {/* Note Content */}
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {note.content}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Calendar size={12} />
                      <span>{formattedDate}</span>
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDelete(note.bookId, note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        title={t("delete", { defaultValue: "Eliminar nota" })}
                      >
                        <Trash2 size={14} />
                      </button>

                      <Link
                        href={`/read/${note.bookId}?page=${note.pageNumber}`}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline text-xs"
                      >
                        <span>{t("openInBook", { defaultValue: "Ver en lector" })}</span>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-40 hover:bg-secondary transition-colors"
          >
            {t("previous", { defaultValue: "Anterior" })}
          </button>
          <span className="text-xs text-muted-foreground font-mono">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-40 hover:bg-secondary transition-colors"
          >
            {t("next", { defaultValue: "Siguiente" })}
          </button>
        </div>
      )}
    </div>
  );
}
