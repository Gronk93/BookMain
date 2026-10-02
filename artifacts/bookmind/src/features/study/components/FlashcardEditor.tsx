import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Check } from "lucide-react";
import type { Flashcard } from "@workspace/api-client-react";

interface FlashcardEditorProps {
  card?: Flashcard | null;
  deckId: string;
  onSave: (cardData: {
    cardType: "concept" | "question" | "cloze";
    front: string;
    back: string;
    explanation?: string;
    sourcePage?: number;
  }) => Promise<void>;
  onClose: () => void;
}

export function FlashcardEditor({
  card,
  deckId,
  onSave,
  onClose,
}: FlashcardEditorProps) {
  const { t } = useTranslation(["study", "common"]);

  const [cardType, setCardType] = useState<"concept" | "question" | "cloze">(
    card?.cardType || "question"
  );
  const [front, setFront] = useState(card?.front || "");
  const [back, setBack] = useState(card?.back || "");
  const [explanation, setExplanation] = useState(card?.explanation || "");
  const [sourcePage, setSourcePage] = useState<number | undefined>(
    card?.sourcePage || undefined
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (card) {
      setCardType(card.cardType);
      setFront(card.front);
      setBack(card.back);
      setExplanation(card.explanation || "");
      setSourcePage(card.sourcePage || undefined);
    }
  }, [card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) {
      setError("El frente y reverso de la tarjeta son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave({
        cardType,
        front: front.trim(),
        back: back.trim(),
        explanation: explanation.trim() || undefined,
        sourcePage: sourcePage ? Number(sourcePage) : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Error al guardar la tarjeta.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <h3 className="font-serif text-lg font-bold text-foreground">
            {card
              ? t("flashcards.editCard", { defaultValue: "Editar tarjeta" })
              : t("flashcards.addManual", { defaultValue: "Crear tarjeta" })}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card Type */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              {t("flashcards.type", { defaultValue: "Tipo de tarjeta" })}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCardType("concept")}
                className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition ${
                  cardType === "concept"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t("flashcards.conceptType", { defaultValue: "Concepto" })}
              </button>
              <button
                type="button"
                onClick={() => setCardType("question")}
                className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition ${
                  cardType === "question"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t("flashcards.questionType", { defaultValue: "Pregunta" })}
              </button>
              <button
                type="button"
                onClick={() => setCardType("cloze")}
                className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition ${
                  cardType === "cloze"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t("flashcards.clozeType", { defaultValue: "Cloze" })}
              </button>
            </div>
          </div>

          {/* Front */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              {cardType === "concept"
                ? "¿Qué significa el concepto?"
                : cardType === "cloze"
                ? "Frase incompleta con espacio (ej. La visión precede a _____)"
                : t("flashcards.front", { defaultValue: "Pregunta / Frente" })}
            </label>
            <textarea
              rows={3}
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder="Escribe el anverso..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Back */}
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">
              {cardType === "concept"
                ? "Definición del concepto"
                : cardType === "cloze"
                ? "Palabra o término que completa el espacio"
                : t("flashcards.back", { defaultValue: "Respuesta / Reverso" })}
            </label>
            <textarea
              rows={3}
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder="Escribe la respuesta..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </div>

          {/* Optional Explanation */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {t("flashcards.explanation", {
                defaultValue: "Explicación complementaria (opcional)",
              })}
            </label>
            <input
              type="text"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Contexto adicional o mnemonía..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Source Page */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {t("flashcards.sourcePage", { defaultValue: "Página de referencia (opcional)" })}
            </label>
            <input
              type="number"
              min={1}
              value={sourcePage ?? ""}
              onChange={(e) =>
                setSourcePage(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
              placeholder="Ej. 48"
              className="w-28 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
            >
              <Check size={14} />
              <span>{saving ? "Guardando..." : "Guardar tarjeta"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
