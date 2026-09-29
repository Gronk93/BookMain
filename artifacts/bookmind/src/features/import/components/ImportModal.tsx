import React from "react";
import { useTranslation } from "react-i18next";
import { FileUp, X, Sparkles } from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition hover:bg-secondary"
          aria-label={tc("actions.close")}
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FileUp size={24} />
          </span>
          <h3 className="serif mt-4 text-2xl font-medium">{t("pdfImportModalTitle")}</h3>
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-foreground">
            <div className="flex items-center justify-center gap-2 font-medium text-primary mb-1">
              <Sparkles size={16} />
              <span>BM-PRD-03</span>
            </div>
            <p className="text-muted-foreground">{t("pdfImportNotice")}</p>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            {tc("actions.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
