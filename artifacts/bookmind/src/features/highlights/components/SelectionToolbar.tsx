import React, { useState } from "react";
import { NotebookPen, Copy, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type HighlightColor, type TextSelectionData, COLOR_CONFIG } from "../types";

interface SelectionToolbarProps {
  selection: TextSelectionData;
  onHighlight: (color: HighlightColor) => Promise<void> | void;
  onAddNote: (color: HighlightColor) => Promise<void> | void;
  onClose: () => void;
}

export function SelectionToolbar({
  selection,
  onHighlight,
  onAddNote,
  onClose,
}: SelectionToolbarProps) {
  const { t } = useTranslation(["reader", "common"]);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.exactText);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 800);
    } catch {
      // Fallback
    }
  };

  const colors: HighlightColor[] = ["yellow", "green", "blue", "red", "violet"];

  return (
    <div
      role="toolbar"
      aria-label={t("selectionToolbar", { defaultValue: "Barra de herramientas de selección" })}
      className="fixed z-50 flex items-center gap-1.5 p-1.5 rounded-full shadow-2xl border border-border/60 bg-popover/95 backdrop-blur-md text-popover-foreground transition-all duration-150 animate-in fade-in zoom-in-95"
      style={{
        top: `${selection.position.top}px`,
        left: `${selection.position.left}px`,
        transform: "translateX(-50%)",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 5 Semantic Highlight Colors */}
      <div className="flex items-center gap-1 px-1">
        {colors.map((color) => {
          const cfg = COLOR_CONFIG[color];
          return (
            <button
              key={color}
              onClick={() => onHighlight(color)}
              title={`${t(cfg.nameKey, { defaultValue: color })} (${cfg.category})`}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-115 active:scale-95 flex items-center justify-center ${cfg.borderClass}`}
              style={{ backgroundColor: cfg.hex }}
              aria-label={`Subrayar ${color}`}
            />
          );
        })}
      </div>

      <div className="h-4 w-px bg-border/60 mx-0.5" />

      {/* Add Attached Note Button */}
      <button
        onClick={() => onAddNote("yellow")}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium hover:bg-secondary transition-colors"
        title={t("addNote", { defaultValue: "Añadir nota" })}
      >
        <NotebookPen size={14} className="text-accent" />
        <span className="hidden sm:inline">{t("note", { defaultValue: "Nota" })}</span>
      </button>

      {/* Copy Quote Button */}
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        title={t("copyQuote", { defaultValue: "Copiar cita" })}
      >
        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
