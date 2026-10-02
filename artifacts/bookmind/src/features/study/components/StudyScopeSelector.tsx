import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Bookmark, Book, Highlighter, Layers } from "lucide-react";
import { useGetBookSeparators } from "@workspace/api-client-react";

export type ScopeType = "page" | "page_range" | "separator" | "book" | "highlights";

export interface StudyScopeValue {
  scope: {
    type: ScopeType;
    pageNumber?: number;
    startPage?: number;
    endPage?: number;
    separatorId?: string;
  };
  includeHighlights?: boolean;
  includeNotes?: boolean;
}

interface StudyScopeSelectorProps {
  bookId: string;
  totalPages?: number;
  initialScope?: StudyScopeValue;
  onChange: (value: StudyScopeValue) => void;
  showPersonalOptions?: boolean;
}

export function StudyScopeSelector({
  bookId,
  totalPages = 100,
  initialScope,
  onChange,
  showPersonalOptions = true,
}: StudyScopeSelectorProps) {
  const { t } = useTranslation(["study", "common"]);
  const { data: separators = [] } = useGetBookSeparators(bookId);

  const [scopeType, setScopeType] = useState<ScopeType>(
    initialScope?.scope.type || "page_range"
  );
  const [pageNumber, setPageNumber] = useState<number>(
    initialScope?.scope.pageNumber || 1
  );
  const [startPage, setStartPage] = useState<number>(
    initialScope?.scope.startPage || 1
  );
  const [endPage, setEndPage] = useState<number>(
    initialScope?.scope.endPage || Math.min(totalPages, 10)
  );
  const [separatorId, setSeparatorId] = useState<string>(
    initialScope?.scope.separatorId || ""
  );
  const [includeHighlights, setIncludeHighlights] = useState<boolean>(
    initialScope?.includeHighlights ?? true
  );
  const [includeNotes, setIncludeNotes] = useState<boolean>(
    initialScope?.includeNotes ?? false
  );

  useEffect(() => {
    if (separators.length > 0 && !separatorId) {
      setSeparatorId(separators[0].id);
    }
  }, [separators, separatorId]);

  useEffect(() => {
    let scopeObj: StudyScopeValue["scope"];

    if (scopeType === "page") {
      scopeObj = { type: "page", pageNumber: Math.max(1, pageNumber) };
    } else if (scopeType === "page_range") {
      const validStart = Math.max(1, Math.min(startPage, endPage));
      const validEnd = Math.max(validStart, Math.min(endPage, totalPages));
      scopeObj = { type: "page_range", startPage: validStart, endPage: validEnd };
    } else if (scopeType === "separator") {
      scopeObj = { type: "separator", separatorId: separatorId || (separators[0]?.id ?? "") };
    } else if (scopeType === "highlights") {
      scopeObj = { type: "highlights" };
    } else {
      scopeObj = { type: "book" };
    }

    onChange({
      scope: scopeObj,
      includeHighlights,
      includeNotes,
    });
  }, [
    scopeType,
    pageNumber,
    startPage,
    endPage,
    separatorId,
    includeHighlights,
    includeNotes,
    separators,
    totalPages,
  ]);

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
      <h3 className="font-serif text-sm font-semibold tracking-tight text-foreground flex items-center gap-2">
        <Layers size={16} className="text-primary" />
        <span>{t("scope.title", { defaultValue: "¿Qué quieres estudiar?" })}</span>
      </h3>

      {/* Scope radio options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <label
          className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition-all ${
            scopeType === "page_range"
              ? "border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary/30"
              : "border-border hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <input
            type="radio"
            name="scopeType"
            value="page_range"
            checked={scopeType === "page_range"}
            onChange={() => setScopeType("page_range")}
            className="text-primary focus:ring-primary/40"
          />
          <FileText size={15} className="text-primary shrink-0" />
          <span>{t("scope.pageRange", { defaultValue: "Rango de páginas" })}</span>
        </label>

        <label
          className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition-all ${
            scopeType === "page"
              ? "border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary/30"
              : "border-border hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <input
            type="radio"
            name="scopeType"
            value="page"
            checked={scopeType === "page"}
            onChange={() => setScopeType("page")}
            className="text-primary focus:ring-primary/40"
          />
          <FileText size={15} className="text-primary shrink-0" />
          <span>{t("scope.page", { defaultValue: "Página específica" })}</span>
        </label>

        <label
          className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition-all ${
            scopeType === "separator"
              ? "border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary/30"
              : "border-border hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <input
            type="radio"
            name="scopeType"
            value="separator"
            checked={scopeType === "separator"}
            onChange={() => setScopeType("separator")}
            className="text-primary focus:ring-primary/40"
          />
          <Bookmark size={15} className="text-primary shrink-0" />
          <span>{t("scope.separator", { defaultValue: "Separador" })}</span>
        </label>

        <label
          className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition-all ${
            scopeType === "highlights"
              ? "border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary/30"
              : "border-border hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <input
            type="radio"
            name="scopeType"
            value="highlights"
            checked={scopeType === "highlights"}
            onChange={() => setScopeType("highlights")}
            className="text-primary focus:ring-primary/40"
          />
          <Highlighter size={15} className="text-primary shrink-0" />
          <span>{t("scope.highlights", { defaultValue: "Mis subrayados" })}</span>
        </label>

        <label
          className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition-all ${
            scopeType === "book"
              ? "border-primary bg-primary/5 font-medium text-foreground ring-1 ring-primary/30"
              : "border-border hover:bg-secondary/60 text-muted-foreground"
          }`}
        >
          <input
            type="radio"
            name="scopeType"
            value="book"
            checked={scopeType === "book"}
            onChange={() => setScopeType("book")}
            className="text-primary focus:ring-primary/40"
          />
          <Book size={15} className="text-primary shrink-0" />
          <span>{t("scope.book", { defaultValue: "Libro completo" })}</span>
        </label>
      </div>

      {/* Scope parameter inputs */}
      <div className="pt-2">
        {scopeType === "page" && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted-foreground">
              {t("scope.pageNumber", { defaultValue: "Página" })}:
            </label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageNumber}
              onChange={(e) => setPageNumber(parseInt(e.target.value, 10) || 1)}
              className="w-24 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground">/ {totalPages}</span>
          </div>
        )}

        {scopeType === "page_range" && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-muted-foreground">
              {t("scope.startPage", { defaultValue: "Desde" })}:
            </label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={startPage}
              onChange={(e) => setStartPage(parseInt(e.target.value, 10) || 1)}
              className="w-20 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <label className="text-xs text-muted-foreground">
              {t("scope.endPage", { defaultValue: "Hasta" })}:
            </label>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={endPage}
              onChange={(e) => setEndPage(parseInt(e.target.value, 10) || 1)}
              className="w-20 rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground font-mono">
              ({Math.max(1, endPage - startPage + 1)} págs.)
            </span>
          </div>
        )}

        {scopeType === "separator" && (
          <div>
            {separators.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No tienes separadores creados en este libro.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">
                  {t("scope.selectSeparator", { defaultValue: "Separador" })}:
                </label>
                <select
                  value={separatorId}
                  onChange={(e) => setSeparatorId(e.target.value)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {separators.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} (págs. {s.startPage}–{s.endPage})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {scopeType === "highlights" && (
          <p className="text-xs text-muted-foreground">
            Se generará contenido utilizando exclusivamente tus subrayados activos en este libro.
          </p>
        )}

        {scopeType === "book" && (
          <p className="text-xs text-muted-foreground">
            Se procesará el contenido general de todo el libro de forma fundamentada.
          </p>
        )}
      </div>

      {/* Personal study customization options */}
      {showPersonalOptions && (
        <div className="pt-3 border-t border-border/50 flex flex-wrap gap-5 text-xs text-foreground">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHighlights}
              onChange={(e) => setIncludeHighlights(e.target.checked)}
              className="rounded text-primary focus:ring-primary/40"
            />
            <span>{t("scope.includeHighlights", { defaultValue: "Incluir mis subrayados" })}</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="rounded text-primary focus:ring-primary/40"
            />
            <span>{t("scope.includeNotes", { defaultValue: "Incluir mis notas personales" })}</span>
          </label>
        </div>
      )}
    </div>
  );
}
