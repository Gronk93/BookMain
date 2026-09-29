import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  useImportBookPdf,
  getGetBooksQueryKey,
} from "@workspace/api-client-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bookId: string) => void;
}

type ImportStage = "idle" | "validating" | "hashing" | "storing" | "inspecting" | "complete" | "duplicate" | "error";

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const { t } = useTranslation("library");
  const { t: te } = useTranslation("errors");
  const { t: tc } = useTranslation("common");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [stage, setStage] = useState<ImportStage>("idle");
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateBookId, setDuplicateBookId] = useState<string | null>(null);
  const [createdBookId, setCreatedBookId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const importMutation = useImportBookPdf();

  // Reset state when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setIsDragging(false);
      setTitle("");
      setAuthor("");
      setStage("idle");
      setProgressPercent(0);
      setErrorMessage(null);
      setDuplicateBookId(null);
      setCreatedBookId(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const generateFallbackTitle = (filename: string): string => {
    const base = filename.replace(/\.[^/.]+$/, "");
    const withSpaces = base.replace(/[-_]+/g, " ").trim();
    if (!withSpaces) return "Documento PDF";
    return withSpaces
      .split(" ")
      .filter((w) => w.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setDuplicateBookId(null);

    // Basic client checks
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMessage(te("PDF_INVALID_TYPE"));
      return;
    }

    if (file.size === 0) {
      setErrorMessage(te("PDF_EMPTY"));
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setErrorMessage(te("PDF_TOO_LARGE"));
      return;
    }

    setSelectedFile(file);
    setTitle(generateFallbackTitle(file.name));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile) return;

    setStage("validating");
    setProgressPercent(15);
    setErrorMessage(null);
    setDuplicateBookId(null);

    // Simulate visual stage progression while upload is processed
    let simulatedProgress = 15;
    timerRef.current = setInterval(() => {
      simulatedProgress = Math.min(simulatedProgress + 15, 85);
      setProgressPercent(simulatedProgress);

      if (simulatedProgress >= 25 && simulatedProgress < 50) {
        setStage("hashing");
      } else if (simulatedProgress >= 50 && simulatedProgress < 70) {
        setStage("storing");
      } else if (simulatedProgress >= 70) {
        setStage("inspecting");
      }
    }, 300);

    try {
      const response = await importMutation.mutateAsync({
        data: {
          file: selectedFile,
          title: title.trim() || undefined,
          author: author.trim() || undefined,
        },
      });

      if (timerRef.current) clearInterval(timerRef.current);
      setProgressPercent(100);
      setStage("complete");
      setCreatedBookId(response.book.id);

      // Invalidate book list cache in TanStack Query
      await queryClient.invalidateQueries({ queryKey: getGetBooksQueryKey() });

      if (onSuccess) {
        onSuccess(response.book.id);
      }
    } catch (err: any) {
      if (timerRef.current) clearInterval(timerRef.current);

      const status = err?.status;
      const errData = err?.data?.error;
      const code = errData?.code;

      if (status === 409 || code === "PDF_DUPLICATE") {
        setStage("duplicate");
        setDuplicateBookId(errData?.details?.existingBookId || null);
        setErrorMessage(te("PDF_DUPLICATE"));
      } else {
        setStage("error");
        const translatedMsg = code && te(code) !== code ? te(code) : errData?.message || te("PDF_IMPORT_FAILED");
        setErrorMessage(translatedMsg);
      }
    }
  };

  const getStageLabel = () => {
    switch (stage) {
      case "validating":
        return t("stageValidating");
      case "hashing":
        return t("stageHashing");
      case "storing":
        return t("stageStoring");
      case "inspecting":
        return t("stageInspecting");
      case "complete":
        return t("stageComplete");
      default:
        return t("importing");
    }
  };

  const isWorking =
    stage === "validating" ||
    stage === "hashing" ||
    stage === "storing" ||
    stage === "inspecting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isWorking}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground transition hover:bg-secondary disabled:opacity-50"
          aria-label={tc("actions.close")}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            <UploadCloud size={20} />
          </span>
          <div>
            <h3 className="serif text-2xl font-medium">{t("pdfImportModalTitle")}</h3>
            <p className="text-xs text-muted-foreground">BM-PRD-03 · Ingestión & Almacenamiento Local Privado</p>
          </div>
        </div>

        {/* State: Success */}
        {stage === "complete" ? (
          <div className="text-center py-6 animate-rise-in">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
              <CheckCircle2 size={36} />
            </span>
            <h4 className="serif text-2xl font-medium text-foreground">{t("stageComplete")}</h4>
            <p className="mt-2 text-sm text-muted-foreground">
              {title || selectedFile?.name}
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary transition"
              >
                {t("yourLibrary")}
              </button>
              {createdBookId && (
                <button
                  onClick={() => {
                    onClose();
                    setLocation(`/read/${createdBookId}`);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition"
                >
                  <span>{t("continueReading")}</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        ) : isWorking ? (
          /* State: In Progress */
          <div className="py-6 text-center animate-fade-in">
            <Loader2 size={36} className="mx-auto animate-spin text-primary mb-4" />
            <p className="serif text-xl font-medium text-foreground">{getStageLabel()}</p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedFile?.name}</p>

            <div className="mt-6 mx-auto max-w-sm">
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="mono mt-2 block text-xs text-muted-foreground">{progressPercent}%</span>
            </div>
          </div>
        ) : (
          /* State: File Selection & Metadata Form */
          <div>
            {/* Duplicate or Generic Error Alert */}
            {stage === "duplicate" ? (
              <div className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-foreground animate-fade-in">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-900 dark:text-amber-200">
                      {t("duplicateWarning")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      El hash criptográfico SHA-256 coincide con un libro ya existente en tu biblioteca.
                    </p>
                    {duplicateBookId && (
                      <button
                        onClick={() => {
                          onClose();
                          setLocation(`/read/${duplicateBookId}`);
                        }}
                        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <span>{t("openExistingBook")}</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : errorMessage ? (
              <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">{errorMessage}</p>
              </div>
            ) : null}

            {!selectedFile ? (
              /* Dropzone */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`group cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />

                <span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary transition group-hover:scale-105">
                  <UploadCloud size={24} />
                </span>
                <p className="serif mt-3 text-lg font-medium text-foreground">{t("dropzoneTitle")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("dropzoneHint")}</p>
              </div>
            ) : (
              /* Selected File & Metadata */
              <div className="space-y-4">
                {/* Selected File Card */}
                <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 p-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <FileText size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                      <p className="mono text-xs text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setTitle("");
                      setAuthor("");
                      setErrorMessage(null);
                      setStage("idle");
                    }}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition"
                    title={tc("actions.delete")}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Metadata Fields */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t("titleLabel")}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("titlePlaceholder")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {t("authorLabel")}
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t("authorPlaceholder")}
                    className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Import Action */}
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary transition"
                  >
                    {tc("actions.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={handleStartImport}
                    disabled={!selectedFile || isWorking}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 transition disabled:opacity-50"
                  >
                    <Sparkles size={16} />
                    <span>{t("importButton")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
