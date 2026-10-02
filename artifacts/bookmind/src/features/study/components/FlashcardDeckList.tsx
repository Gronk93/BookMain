import React, { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Layers,
  Plus,
  Sparkles,
  Play,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  AlertTriangle,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  useListFlashcardDecks,
  useListDeckCards,
  useCreateFlashcardDeck,
  useDeleteFlashcardDeck,
  useGenerateFlashcardsForDeck,
  useCreateManualFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
  type Flashcard,
  type FlashcardDeck,
  type GenerateFlashcardsRequestCount,
} from "@workspace/api-client-react";
import {
  StudyScopeSelector,
  type StudyScopeValue,
} from "./StudyScopeSelector";
import { FlashcardEditor } from "./FlashcardEditor";

interface FlashcardDeckListProps {
  bookId: string;
  totalPages?: number;
  onSelectDeckForReview?: (deckId: string) => void;
}

export function FlashcardDeckList({
  bookId,
  totalPages = 100,
  onSelectDeckForReview,
}: FlashcardDeckListProps) {
  const { t } = useTranslation(["study", "common"]);

  const { data: decksData, isLoading: loadingDecks, refetch: refetchDecks } =
    useListFlashcardDecks(bookId);

  const decks: FlashcardDeck[] = decksData?.items || [];

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  // Deck cards query
  const {
    data: cardsData,
    isLoading: loadingCards,
    refetch: refetchCards,
  } = useListDeckCards(bookId, selectedDeckId || "", {
    query: {
      enabled: !!selectedDeckId,
    } as any,
  });

  const selectedCards: Flashcard[] = cardsData?.items || [];
  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  // UI modals & state
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [showGenerateAiModal, setShowGenerateAiModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  const [showManualCardModal, setShowManualCardModal] = useState(false);

  // New deck form state
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [deckScopeValue, setDeckScopeValue] = useState<StudyScopeValue>({
    scope: { type: "book" },
    includeHighlights: true,
  });

  // AI Generation state
  const [generateCount, setGenerateCount] = useState<5 | 10 | 20>(10);

  // Mutations
  const createDeckMutation = useCreateFlashcardDeck();
  const deleteDeckMutation = useDeleteFlashcardDeck();
  const generateCardsMutation = useGenerateFlashcardsForDeck();
  const createCardMutation = useCreateManualFlashcard();
  const updateCardMutation = useUpdateFlashcard();
  const deleteCardMutation = useDeleteFlashcard();

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;

    try {
      const res = await createDeckMutation.mutateAsync({
        bookId,
        data: {
          title: newDeckTitle.trim(),
          scope: deckScopeValue.scope as any,
        },
      });
      setNewDeckTitle("");
      setShowCreateDeckModal(false);
      refetchDecks();
      setSelectedDeckId(res.id);
    } catch (err) {
      console.error("Failed to create deck:", err);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm("¿Deseas eliminar este mazo de tarjetas?")) return;
    try {
      await deleteDeckMutation.mutateAsync({ bookId, deckId });
      if (selectedDeckId === deckId) setSelectedDeckId(null);
      refetchDecks();
    } catch (err) {
      console.error("Failed to delete deck:", err);
    }
  };

  const handleGenerateAiCards = async () => {
    if (!selectedDeckId) return;
    try {
      await generateCardsMutation.mutateAsync({
        bookId,
        deckId: selectedDeckId,
        data: {
          count: generateCount as GenerateFlashcardsRequestCount,
        },
      });
      setShowGenerateAiModal(false);
      refetchCards();
      refetchDecks();
    } catch (err) {
      console.error("Failed to generate AI flashcards:", err);
    }
  };

  const handleSaveCard = async (cardData: {
    cardType: "concept" | "question" | "cloze";
    front: string;
    back: string;
    explanation?: string;
    sourcePage?: number;
  }) => {
    if (!selectedDeckId) return;

    if (editingCard) {
      await updateCardMutation.mutateAsync({
        bookId,
        cardId: editingCard.id,
        data: cardData,
      });
    } else {
      await createCardMutation.mutateAsync({
        bookId,
        deckId: selectedDeckId,
        data: cardData,
      });
    }

    setEditingCard(null);
    setShowManualCardModal(false);
    refetchCards();
    refetchDecks();
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm("¿Eliminar esta tarjeta?")) return;
    try {
      await deleteCardMutation.mutateAsync({ bookId, cardId });
      refetchCards();
      refetchDecks();
    } catch (err) {
      console.error("Failed to delete card:", err);
    }
  };

  const handleDuplicateCard = async (card: Flashcard) => {
    if (!selectedDeckId) return;
    try {
      await createCardMutation.mutateAsync({
        bookId,
        deckId: selectedDeckId,
        data: {
          cardType: card.cardType,
          front: `${card.front} (copia)`,
          back: card.back,
          explanation: card.explanation ?? undefined,
          sourcePage: card.sourcePage ?? undefined,
        },
      });
      refetchCards();
      refetchDecks();
    } catch (err) {
      console.error("Failed to duplicate card:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Decks Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/50">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="text-primary size-6" />
            <span>{t("flashcards.decks", { defaultValue: "Mazos de tarjetas" })}</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Tarjetas de memoria activa organizadas por temas o alcances del libro.
          </p>
        </div>

        <button
          onClick={() => setShowCreateDeckModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          <Plus size={14} />
          <span>{t("flashcards.newDeck", { defaultValue: "Nuevo mazo" })}</span>
        </button>
      </div>

      {/* Decks Grid */}
      {loadingDecks ? (
        <div className="py-12 flex justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : decks.length === 0 ? (
        <div className="text-center rounded-2xl border border-dashed border-border/70 py-16 px-4">
          <Layers className="mx-auto size-10 text-muted-foreground/40 mb-3" />
          <h3 className="font-serif text-base font-medium text-foreground">
            {t("flashcards.emptyDecks", { defaultValue: "No tienes ningún mazo de tarjetas para este libro." })}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Crea un mazo para comenzar a generar tarjetas de estudio personalizadas o manuales.
          </p>
          <button
            onClick={() => setShowCreateDeckModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            <Plus size={14} />
            <span>{t("flashcards.createDeck", { defaultValue: "Crear mazo" })}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {decks.map((deck) => {
            const isSelected = selectedDeckId === deck.id;
            const count = deck.cardsCount ?? 0;
            return (
              <div
                key={deck.id}
                onClick={() => setSelectedDeckId(deck.id)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                    : "border-border bg-card hover:border-border/80 hover:bg-secondary/40"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-sm font-bold text-foreground line-clamp-1">
                      {deck.title}
                    </h3>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                      {count} {count === 1 ? "tarjeta" : "tarjetas"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 capitalize font-mono">
                    {deck.scopeType}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  {onSelectDeckForReview && count > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDeckForReview(deck.id);
                      }}
                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs"
                    >
                      <Play size={12} />
                      <span>Repasar</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      {isSelected ? "Seleccionado" : "Click para ver"}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDeck(deck.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive transition"
                    title="Eliminar mazo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Deck Details & Cards Section */}
      {selectedDeckId && (
        <div className="pt-6 border-t border-border/60 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-foreground flex items-center gap-2">
                <span>{selectedDeck?.title || "Mazo seleccionado"}</span>
                <span className="text-xs font-normal text-muted-foreground font-mono">
                  ({selectedCards.length} tarjetas)
                </span>
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowManualCardModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition"
              >
                <Plus size={13} />
                <span>{t("flashcards.addManual", { defaultValue: "+ Crear tarjeta" })}</span>
              </button>

              <button
                onClick={() => setShowGenerateAiModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
              >
                <Sparkles size={13} />
                <span>{t("flashcards.generateAi", { defaultValue: "Generar con IA" })}</span>
              </button>

              {onSelectDeckForReview && selectedCards.length > 0 && (
                <button
                  onClick={() => onSelectDeckForReview(selectedDeckId)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition shadow-xs"
                >
                  <Play size={13} />
                  <span>Repasar mazo</span>
                </button>
              )}
            </div>
          </div>

          {/* Cards List in Selected Deck */}
          {loadingCards ? (
            <div className="py-12 flex justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : selectedCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center">
              <p className="text-xs text-muted-foreground">
                {t("flashcards.noCards", { defaultValue: "No hay tarjetas en este mazo todavía." })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {selectedCards.map((card) => {
                const isOutdated = card.status === "outdated";
                const isAi = card.origin === "ai";

                return (
                  <div
                    key={card.id}
                    className="rounded-2xl border border-border bg-card p-4 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                          {card.cardType}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isAi ? (
                            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                              IA
                            </span>
                          ) : (
                            <span className="rounded-full bg-secondary text-muted-foreground px-2 py-0.5 text-[10px] font-medium">
                              Manual
                            </span>
                          )}

                          {card.sourcePage && (
                            <Link
                              href={`/read/${bookId}?page=${card.sourcePage}`}
                              className="inline-flex items-center gap-0.5 rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-mono hover:underline"
                            >
                              <span>p. {card.sourcePage}</span>
                              <ExternalLink size={8} />
                            </Link>
                          )}
                        </div>
                      </div>

                      {isOutdated && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 p-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>{t("flashcards.outdated", { defaultValue: "Fuente desactualizada" })}</span>
                        </div>
                      )}

                      <div className="text-xs font-semibold text-foreground">
                        {card.front}
                      </div>

                      <div className="text-xs text-muted-foreground pl-2 border-l-2 border-border/80">
                        {card.back}
                      </div>

                      {card.explanation && (
                        <div className="text-[11px] text-muted-foreground/80 italic">
                          {card.explanation}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/40 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <button
                        onClick={() => handleDuplicateCard(card)}
                        className="p-1 hover:text-foreground transition rounded"
                        title={t("flashcards.duplicateCard", { defaultValue: "Duplicar" })}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => setEditingCard(card)}
                        className="p-1 hover:text-primary transition rounded"
                        title={t("flashcards.editCard", { defaultValue: "Editar" })}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1 hover:text-destructive transition rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Deck */}
      {showCreateDeckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-foreground">
              {t("flashcards.createDeck", { defaultValue: "Crear mazo" })}
            </h3>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {t("flashcards.deckTitle", { defaultValue: "Título del mazo" })}
                </label>
                <input
                  type="text"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  placeholder="Ej. Conceptos clave cap. 1"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                  autoFocus
                />
              </div>

              <StudyScopeSelector
                bookId={bookId}
                totalPages={totalPages}
                initialScope={deckScopeValue}
                onChange={setDeckScopeValue}
                showPersonalOptions={false}
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowCreateDeckModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createDeckMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {createDeckMutation.isPending ? "Creando..." : "Crear mazo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Generate AI Cards (Section 38: 5, 10, 20 cards) */}
      {showGenerateAiModal && selectedDeckId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Sparkles size={16} className="text-primary" />
              <h3 className="font-serif text-base font-bold text-foreground">
                {t("flashcards.generateAi", { defaultValue: "Generar tarjetas con IA" })}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">
                  {t("flashcards.generateCount", { defaultValue: "Cantidad de tarjetas" })}:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGenerateCount(num as 5 | 10 | 20)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition ${
                        generateCount === num
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {num} tarjetas
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowGenerateAiModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAiCards}
                  disabled={generateCardsMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
                >
                  {generateCardsMutation.isPending ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>{t("flashcards.generating", { defaultValue: "Generando tarjetas..." })}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>Generar {generateCount} tarjetas</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manual Card Creator or Editor */}
      {(showManualCardModal || editingCard) && selectedDeckId && (
        <FlashcardEditor
          card={editingCard}
          deckId={selectedDeckId}
          onSave={handleSaveCard}
          onClose={() => {
            setShowManualCardModal(false);
            setEditingCard(null);
          }}
        />
      )}
    </div>
  );
}
