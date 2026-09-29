import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X, FileText } from "lucide-react";

interface InsightPanelProps {
  selected: boolean;
  onClose: () => void;
}

export function InsightPanel({ selected, onClose }: InsightPanelProps) {
  const { t } = useTranslation("reader");
  const { t: tc } = useTranslation("common");

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <p className="font-medium text-sm">BookMind</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
          aria-label={tc("actions.close")}
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {t("insightTitle")}
      </p>

      <p className="serif mt-2.5 text-2xl leading-tight font-medium">
        {selected ? t("insightSelected") : t("insightUnselected")}
      </p>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {selected ? t("insightExplanation") : t("insightPrompt")}
      </p>

      <div className="mt-6 flex items-center gap-2 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
        <FileText size={14} className="shrink-0" />
        <span>{t("basedOnCurrentPage")}</span>
      </div>
    </div>
  );
}
