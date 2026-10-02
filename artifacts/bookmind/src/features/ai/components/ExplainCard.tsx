import React, { useEffect, useState } from "react";
import { Sparkles, X, Copy, Check, NotebookPen, ExternalLink, Loader2, Tag } from "lucide-react";

export interface ExplainCardProps {
  bookId: string;
  text: string;
  pageNumber: number;
  startBlockId?: string | null;
  startOffset?: number | null;
  endBlockId?: string | null;
  endOffset?: number | null;
  prefixText?: string | null;
  suffixText?: string | null;
  onClose: () => void;
  onNavigateCitation?: (pageNumber: number) => void;
  onAddNote?: (content: string) => void;
}

export interface ExplainData {
  explanation: string;
  keyConcepts: string[];
  citation: {
    id: string;
    pageNumber: number;
    quote: string;
  };
}

export function ExplainCard({
  bookId,
  text,
  pageNumber,
  startBlockId,
  startOffset,
  endBlockId,
  endOffset,
  prefixText,
  suffixText,
  onClose,
  onNavigateCitation,
  onAddNote,
}: ExplainCardProps) {
  const [data, setData] = useState<ExplainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchExplanation() {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`/api/books/${bookId}/ai/explain`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text,
            pageNumber,
            startBlockId,
            startOffset,
            endBlockId,
            endOffset,
            prefixText,
            suffixText,
          }),
        });

        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load explanation");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (text) {
      fetchExplanation();
    }

    return () => {
      cancelled = true;
    };
  }, [bookId, text, pageNumber, startBlockId, startOffset, endBlockId, endOffset, prefixText, suffixText]);

  const handleCopy = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveAsNote = () => {
    if (!data || !onAddNote) return;
    const noteText = `[Explicación: "${text.slice(0, 60)}..."]\n${data.explanation}`;
    onAddNote(noteText);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Explicar Selección"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl text-card-foreground overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                Explicación de Pasaje
              </h3>
              <p className="text-xs text-muted-foreground">
                Pág. {pageNumber} &bull; Fragmento seleccionado
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Selected Quote Preview */}
        <div className="mb-3.5 p-2.5 rounded-lg bg-secondary/30 border border-border/40 text-xs italic text-muted-foreground line-clamp-2">
          "{text}"
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm">Generando explicación fundamentada...</p>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-destructive text-sm">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-1">
            <div className="p-3.5 rounded-xl bg-card border border-border/60 leading-relaxed text-foreground/90">
              {data.explanation}
            </div>

            {/* Key Concepts */}
            {data.keyConcepts && data.keyConcepts.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground block mb-2">
                  Conceptos clave identificados:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {data.keyConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                    >
                      <Tag size={11} />
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Citation Link & Actions */}
            <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
              <button
                onClick={() => {
                  onNavigateCitation?.(pageNumber);
                  onClose();
                }}
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
              >
                <ExternalLink size={13} />
                <span>Página {pageNumber}</span>
              </button>
              <div className="flex items-center gap-2">
                {onAddNote && (
                  <button
                    onClick={handleSaveAsNote}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    title="Guardar como nota"
                  >
                    <NotebookPen size={13} />
                    <span>Guardar nota</span>
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  title="Copiar explicación"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
