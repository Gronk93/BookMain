import React, { useState } from "react";
import { RefreshCw, ImageOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type Highlight } from "@/features/highlights/types";
import { TextLayer } from "@/features/highlights/components/TextLayer";

interface OriginalPageProps {
  bookId: string;
  pageNumber: number;
  zoom?: number; // 50 to 200
  rotation?: number;
  width?: number | null;
  height?: number | null;
  textBlocks?: any[] | null;
  highlights?: Highlight[];
  onHighlightClick?: (highlight: Highlight, event: React.MouseEvent) => void;
  className?: string;
}

export function OriginalPage({
  bookId,
  pageNumber,
  zoom = 100,
  rotation = 0,
  width,
  height,
  textBlocks,
  highlights = [],
  onHighlightClick,
  className = "",
}: OriginalPageProps) {
  const { t } = useTranslation(["reader", "common"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const previewUrl = `/api/books/${bookId}/pages/${pageNumber}/preview?k=${reloadKey}`;

  const handleRetry = () => {
    setError(false);
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const scale = zoom / 100;

  return (
    <div
      className={`relative flex items-center justify-center overflow-auto w-full h-full select-none ${className}`}
      style={{ minHeight: "350px" }}
    >
      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md aspect-[1/1.4] rounded-md bg-muted/40 animate-pulse border border-border/20 flex flex-col items-center justify-center gap-3">
            <span className="text-xs text-muted-foreground font-serif">
              {t("loadingPage", { defaultValue: "Cargando página..." })}
            </span>
          </div>
        </div>
      )}

      {/* Error Fallback */}
      {error && (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
          <ImageOff size={32} className="opacity-60" />
          <p className="text-xs font-serif">
            {t("previewFailed", { defaultValue: "No se pudo cargar la vista original de la página." })}
          </p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-muted text-foreground transition-colors"
          >
            <RefreshCw size={12} />
            <span>{t("retry", { defaultValue: "Reintentar" })}</span>
          </button>
        </div>
      )}

      {/* Rendered Preview Image with TextLayer */}
      <div
        className="relative inline-block shadow-sm rounded-sm"
        style={{
          transform: `scale(${scale}) rotate(${rotation}deg)`,
          transformOrigin: "center center",
        }}
      >
        <img
          key={`${pageNumber}-${reloadKey}`}
          src={previewUrl}
          alt={`Página ${pageNumber}`}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
        />
        {!loading && !error && (
          <TextLayer
            pageNumber={pageNumber}
            textBlocks={textBlocks}
            pageWidth={width}
            pageHeight={height}
            highlights={highlights}
            onHighlightClick={onHighlightClick}
          />
        )}
      </div>
    </div>
  );
}
