import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { NotebookPen, X, Check, Trash2 } from "lucide-react";

interface NotePanelProps {
  initialContent: string;
  pageNumber: number;
  onSave: (content: string) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
}

export function NotePanel({
  initialContent,
  pageNumber,
  onSave,
  onDelete,
  onClose,
}: NotePanelProps) {
  const { t } = useTranslation("notes");
  const { t: tc } = useTranslation("common");

  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      await onSave(content);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2">
          <NotebookPen size={16} className="text-accent" />
          <p className="font-medium text-sm">
            {t("pageNote", { page: pageNumber })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary"
          aria-label={tc("actions.close")}
        >
          <X size={16} />
        </button>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("notePlaceholder")}
        rows={6}
        className="mt-4 w-full resize-none rounded-xl border border-border bg-background/70 p-3.5 text-sm leading-6 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />

      <div className="mt-3 flex items-center justify-between">
        <div className="text-[11px] text-muted-foreground">
          {justSaved ? (
            <span className="flex items-center gap-1 text-primary">
              <Check size={12} /> {tc("actions.save")}
            </span>
          ) : (
            t("savedAutomatically")
          )}
        </div>

        <div className="flex items-center gap-2">
          {onDelete && initialContent && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
              title={tc("actions.delete")}
            >
              <Trash2 size={15} />
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !content.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {isSaving ? tc("actions.saving") : tc("actions.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
