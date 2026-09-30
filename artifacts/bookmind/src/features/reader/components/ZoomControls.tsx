import React from "react";
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ZoomControlsProps {
  zoom: number; // 50 to 200
  onZoomChange: (zoom: number) => void;
  onFitWidth?: () => void;
  onFitPage?: () => void;
}

export function ZoomControls({
  zoom,
  onZoomChange,
  onFitWidth,
  onFitPage,
}: ZoomControlsProps) {
  const { t } = useTranslation(["reader", "common"]);

  const handleZoomIn = () => {
    onZoomChange(Math.min(200, zoom + 25));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(50, zoom - 25));
  };

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs shadow-md backdrop-blur-md border border-border/40">
      <button
        onClick={handleZoomOut}
        disabled={zoom <= 50}
        aria-label="Zoom out"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
      >
        <ZoomOut size={14} />
      </button>

      <span className="w-10 text-center font-mono text-[11px] text-foreground font-medium select-none">
        {zoom}%
      </span>

      <button
        onClick={handleZoomIn}
        disabled={zoom >= 200}
        aria-label="Zoom in"
        className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 transition-colors"
      >
        <ZoomIn size={14} />
      </button>

      <div className="mx-1 h-3.5 w-px bg-border/60" />

      {onFitWidth && (
        <button
          onClick={onFitWidth}
          title={t("fitWidth", { defaultValue: "Ajustar ancho" })}
          className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {t("fitWidthShort", { defaultValue: "Ancho" })}
        </button>
      )}

      {onFitPage && (
        <button
          onClick={onFitPage}
          title={t("fitPage", { defaultValue: "Ajustar página" })}
          className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          {t("fitPageShort", { defaultValue: "Página" })}
        </button>
      )}
    </div>
  );
}
