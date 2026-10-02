import React, { useEffect, useState } from "react";
import { BookOpen, Lightbulb, Quote, Sparkles, X, Copy, Check, NotebookPen, ExternalLink, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface DictionaryCardProps {
  bookId: string;
  term: string;
  pageNumber: number;
  contextSentence?: string | null;
  blockId?: string | null;
  offset?: number | null;
  onClose: () => void;
  onNavigateCitation?: (pageNumber: number) => void;
  onAddNote?: (content: string) => void;
}

export interface DefineData {
  term: string;
  definition: string;
  simpleExplanation: string;
  contextExplanation: string;
  example: string;
  pageNumber: number;
  citation?: {
    id: string;
    pageNumber: number;
    quote: string;
  } | null;
}

export function DictionaryCard({
  bookId,
  term,
  pageNumber,
  contextSentence,
  blockId,
  offset,
  onClose,
  onNavigateCitation,
  onAddNote,
}: DictionaryCardProps) {
  const { t } = useTranslation(["reader", "common"]);
  const [data, setData] = useState<DefineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchDefinition() {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`/api/books/${bookId}/ai/define`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            term,
            pageNumber,
            blockId,
            offset,
            contextSentence,
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
          setError(err.message || "Failed to load definition");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (term) {
      fetchDefinition();
    }

    return () => {
      cancelled = true;
    };
  }, [bookId, term, pageNumber, blockId, offset, contextSentence]);

  const handleCopy = async () => {
    if (!data) return;
    const textToCopy = `"${data.term}":\n1. Definición: ${data.definition}\n2. Sencillo: ${data.simpleExplanation}\n3. En contexto: ${data.contextExplanation}\n4. Ejemplo: ${data.example}`;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveAsNote = () => {
    if (!data || !onAddNote) return;
    const noteText = `[Diccionario: ${data.term}]\n${data.definition}\n\nEn este contexto: ${data.contextExplanation}`;
    onAddNote(noteText);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Diccionario Contextual"
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
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">
                Diccionario Contextual
              </h3>
              <p className="text-xs text-muted-foreground">
                Término: <span className="font-medium text-foreground">"{term}"</span> (Pág. {pageNumber})
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

        {/* Content */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm">Consultando definición contextual...</p>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-destructive text-sm">
            {error}
          </div>
        ) : data ? (
          <div className="space-y-3.5 text-sm max-h-[60vh] overflow-y-auto pr-1">
            {/* Block 1: Definición formal */}
            <div className="p-3 rounded-xl bg-secondary/40 border border-border/40">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                <BookOpen size={14} />
                <span>Definición Formal</span>
              </div>
              <p className="text-foreground/90 leading-relaxed">{data.definition}</p>
            </div>

            {/* Block 2: En palabras sencillas */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                <Lightbulb size={14} />
                <span>En Palabras Sencillas</span>
              </div>
              <p className="text-foreground/90 leading-relaxed">{data.simpleExplanation}</p>
            </div>

            {/* Block 3: En este contexto */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                <Quote size={14} />
                <span>En este Contexto (del Libro)</span>
              </div>
              <p className="text-foreground/90 leading-relaxed">{data.contextExplanation}</p>
            </div>

            {/* Block 4: Ejemplo */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                <Sparkles size={14} />
                <span>Ejemplo de Uso</span>
              </div>
              <p className="text-foreground/90 italic leading-relaxed">{data.example}</p>
            </div>

            {/* Citation Link */}
            {data.citation && (
              <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
                <button
                  onClick={() => {
                    onNavigateCitation?.(data.pageNumber);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <ExternalLink size={13} />
                  <span>Ver en página {data.pageNumber}</span>
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
                    title="Copiar definición"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
