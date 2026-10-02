import React, { useEffect, useState, useRef } from "react";
import {
  Bot,
  Send,
  X,
  Plus,
  MessageSquare,
  BookOpen,
  FileText,
  Bookmark,
  ExternalLink,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { Separator } from "@/features/separators/hooks/useSeparators";

export interface BookMindPanelProps {
  bookId: string;
  bookTitle: string;
  currentPage: number;
  selectedText?: string;
  separators?: Separator[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateCitation: (pageNumber: number, citation?: any) => void;
}

export interface ChatCitation {
  id: string;
  pageNumber: number;
  quote: string;
  startBlockId?: string | null;
  startOffset?: number | null;
  endBlockId?: string | null;
  endOffset?: number | null;
  rank: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  insufficientEvidence?: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  scopeType: string;
  updatedAt: string;
}

export function BookMindPanel({
  bookId,
  bookTitle,
  currentPage,
  selectedText,
  separators = [],
  isOpen,
  onClose,
  onNavigateCitation,
}: BookMindPanelProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedScope, setSelectedScope] = useState<"book" | "page" | "selection" | "separator">("book");
  const [selectedSeparatorId, setSelectedSeparatorId] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-switch to selection scope if text is provided
  useEffect(() => {
    if (selectedText && selectedText.trim().length > 0) {
      setSelectedScope("selection");
    }
  }, [selectedText]);

  // Load conversations list
  useEffect(() => {
    if (!isOpen || !bookId) return;
    async function loadConversations() {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`/api/books/${bookId}/ai/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const list: ConversationSummary[] = await res.json();
          setConversations(list);
          if (list.length > 0 && !activeConversationId) {
            setActiveConversationId(list[0].id);
          }
        }
      } catch {
        // Fallback
      }
    }
    loadConversations();
  }, [isOpen, bookId]);

  // Load active conversation messages
  useEffect(() => {
    if (!activeConversationId || !bookId) {
      setMessages([]);
      return;
    }
    async function loadMessages() {
      try {
        const token = localStorage.getItem("token") || "";
        const res = await fetch(`/api/books/${bookId}/ai/conversations/${activeConversationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch {
        // Fallback
      }
    }
    loadMessages();
  }, [activeConversationId, bookId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputQuery("");
  };

  const handleSend = async () => {
    const q = inputQuery.trim();
    if (!q || isSending) return;

    setInputQuery("");
    setIsSending(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const token = localStorage.getItem("token") || "";
      const scopeRef =
        selectedScope === "page"
          ? String(currentPage)
          : selectedScope === "selection"
            ? selectedText || null
            : selectedScope === "separator"
              ? selectedSeparatorId || null
              : null;

      const res = await fetch(`/api/books/${bookId}/ai/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: q,
          scope: selectedScope,
          scopeRef,
          conversationId: activeConversationId || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      if (!activeConversationId && data.conversationId) {
        setActiveConversationId(data.conversationId);
        setConversations((prev) => [
          {
            id: data.conversationId,
            title: q.slice(0, 50),
            scopeType: selectedScope,
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }

      const assistantMsg: ChatMessage = {
        id: data.messageId,
        role: "assistant",
        content: data.answer,
        citations: data.citations || [],
        insufficientEvidence: data.insufficientEvidence,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: "Ocurrió un error al consultar a BookMind. Por favor intenta de nuevo.",
        insufficientEvidence: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      role="region"
      aria-label="Panel BookMind AI"
      className="fixed right-4 bottom-16 top-16 z-30 w-96 max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-md overflow-hidden animate-in slide-in-from-right duration-200 text-card-foreground"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/70 flex items-center justify-between bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm">BookMind AI</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-primary/15 text-primary uppercase tracking-wider">
                Grounded
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
              {bookTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleNewConversation}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Nueva conversación"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Cerrar panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scope Selector Chips */}
      <div className="px-3 py-2 border-b border-border/50 bg-background/50 flex flex-wrap gap-1.5 items-center">
        <span className="text-[11px] font-medium text-muted-foreground mr-1">Ámbito:</span>

        {/* Book scope */}
        <button
          onClick={() => setSelectedScope("book")}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
            selectedScope === "book"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <BookOpen size={11} />
          <span>Libro</span>
        </button>

        {/* Page scope */}
        <button
          onClick={() => setSelectedScope("page")}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
            selectedScope === "page"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          <FileText size={11} />
          <span>Pág. {currentPage}</span>
        </button>

        {/* Selection scope */}
        {selectedText && (
          <button
            onClick={() => setSelectedScope("selection")}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
              selectedScope === "selection"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <Sparkles size={11} />
            <span>Selección</span>
          </button>
        )}

        {/* Separators scope */}
        {separators.length > 0 && (
          <select
            value={selectedScope === "separator" ? selectedSeparatorId : ""}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedScope("separator");
                setSelectedSeparatorId(e.target.value);
              } else {
                setSelectedScope("book");
              }
            }}
            className={`text-xs rounded-full px-2 py-0.5 border border-border bg-secondary text-secondary-foreground focus:outline-none`}
          >
            <option value="">Separador...</option>
            {separators.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.startPage}-{s.endPage})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Pregunta a BookMind</p>
              <p className="text-xs text-muted-foreground max-w-[240px] mt-1">
                Tus consultas se fundamentan estrictamente en el contenido verificado de este libro.
              </p>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-xs"
                    : "bg-secondary/70 border border-border/50 text-foreground rounded-tl-xs shadow-xs"
                }`}
              >
                {/* Insufficient Evidence Warning Banner */}
                {m.insufficientEvidence && (
                  <div className="mb-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-start gap-1.5 text-[11px]">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" />
                    <span>Sin evidencia suficiente en este libro para responder con certeza.</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Citations Chips */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/40 space-y-1">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      Referencias citadas:
                    </span>
                    <div className="flex flex-col gap-1">
                      {m.citations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onNavigateCitation(c.pageNumber, c)}
                          className="w-full text-left inline-flex items-center justify-between p-1.5 rounded-lg bg-card/80 hover:bg-card border border-border/60 text-[11px] text-foreground transition-colors group"
                        >
                          <span className="truncate pr-2 font-medium">
                            Pág. {c.pageNumber}: "{c.quote.slice(0, 45)}..."
                          </span>
                          <ExternalLink size={11} className="shrink-0 text-primary opacity-70 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 size={16} className="animate-spin text-primary" />
            <span>Consultando fuentes del libro...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-border/70 bg-card">
        <div className="relative flex items-center">
          <textarea
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedScope === "selection"
                ? "Pregunta sobre la selección..."
                : selectedScope === "page"
                  ? `Pregunta sobre la página ${currentPage}...`
                  : "Pregunta sobre el libro..."
            }
            rows={1}
            className="w-full resize-none rounded-xl border border-input bg-background/80 px-3.5 py-2.5 pr-10 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary max-h-24"
          />
          <button
            onClick={handleSend}
            disabled={!inputQuery.trim() || isSending}
            className="absolute right-2 p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
            title="Enviar mensaje"
          >
            <Send size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
