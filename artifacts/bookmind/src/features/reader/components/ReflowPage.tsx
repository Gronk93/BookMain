import React from "react";
import { AlertCircle, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  type ReaderFontFamily,
  type ReaderLineHeight,
  type ReaderMargin,
} from "../hooks/useReaderPreferences";

interface TextBlockItem {
  id?: string;
  text: string;
  boundingBox?: number[];
  confidence?: number;
}

interface ReflowPageProps {
  pageNumber: number;
  normalizedText?: string | null;
  textBlocks?: TextBlockItem[] | null;
  qualityScore?: number | null;
  ocrStatus?: string | null;
  isBlank?: boolean | null;
  fontFamily: ReaderFontFamily;
  fontSize: number; // 14 to 28
  lineHeight: ReaderLineHeight;
  margin: ReaderMargin;
  onSwitchToOriginal?: () => void;
  className?: string;
}

export function ReflowPage({
  pageNumber,
  normalizedText,
  textBlocks,
  qualityScore,
  ocrStatus,
  isBlank,
  fontFamily,
  fontSize,
  lineHeight,
  margin,
  onSwitchToOriginal,
  className = "",
}: ReflowPageProps) {
  const { t } = useTranslation(["reader", "common"]);

  const isLowConfidence = typeof qualityScore === "number" && qualityScore < 70;
  const isOcr = ocrStatus === "completed" || ocrStatus === "low_confidence";

  // Line height styling
  const lineHeightClass =
    lineHeight === "compact"
      ? "leading-snug"
      : lineHeight === "relaxed"
      ? "leading-loose"
      : "leading-relaxed";

  // Margin container styling
  const maxWidthClass =
    margin === "narrow"
      ? "max-w-xl"
      : margin === "wide"
      ? "max-w-3xl"
      : "max-w-2xl";

  const fontClass = fontFamily === "serif" ? "font-serif" : "font-sans";

  return (
    <div
      className={`relative w-full flex flex-col items-center py-6 px-4 md:px-8 select-text ${fontClass} ${className}`}
      data-page-number={pageNumber}
    >
      {/* Low-confidence Quality Notice (Section 68-71) */}
      {isLowConfidence && onSwitchToOriginal && (
        <div className="mb-6 w-full max-w-2xl rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-amber-500" />
            <span>
              {t("lowConfidenceNotice", {
                defaultValue: "Texto reconocido con baja confianza.",
              })}
            </span>
          </div>
          <button
            onClick={onSwitchToOriginal}
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            <Eye size={13} />
            <span>{t("viewOriginal", { defaultValue: "Ver página original" })}</span>
          </button>
        </div>
      )}

      {/* Blank Page notice */}
      {isBlank && (
        <div className="my-16 text-center text-muted-foreground/60 italic text-sm">
          {t("blankPage", { defaultValue: "— Página en blanco —" })}
        </div>
      )}

      {/* Main Text Content */}
      <article
        className={`w-full ${maxWidthClass} text-foreground transition-all duration-150 ${lineHeightClass}`}
        style={{ fontSize: `${fontSize}px` }}
      >
        {/* Render textBlocks if available, else paragraphs from normalizedText */}
        {textBlocks && textBlocks.length > 0 ? (
          <div className="space-y-4">
            {textBlocks.map((block, idx) => (
              <p
                key={block.id || `blk-${pageNumber}-${idx}`}
                data-page-number={pageNumber}
                data-block-id={block.id || `b-${idx}`}
                className="whitespace-pre-wrap transition-colors"
              >
                {block.text}
              </p>
            ))}
          </div>
        ) : normalizedText ? (
          <div className="space-y-4">
            {normalizedText
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((para, idx) => (
                <p
                  key={`para-${pageNumber}-${idx}`}
                  data-page-number={pageNumber}
                  data-block-id={`p-${idx}`}
                  className="whitespace-pre-wrap transition-colors"
                >
                  {para.trim()}
                </p>
              ))}
          </div>
        ) : (
          !isBlank && (
            <div className="text-center py-12 text-muted-foreground italic text-sm">
              {t("noTextExtracted", {
                defaultValue: "No hay texto disponible en esta página.",
              })}
            </div>
          )
        )}
      </article>

      {/* Discreet OCR indicator (Section 70 & 74) */}
      {isOcr && (
        <footer className="mt-8 pt-4 border-t border-border/20 w-full max-w-2xl flex items-center justify-between text-[11px] text-muted-foreground/70 font-sans">
          <span>
            {t("ocrSourceNotice", {
              defaultValue: "Texto extraído mediante OCR.",
            })}
          </span>
          {onSwitchToOriginal && (
            <button
              onClick={onSwitchToOriginal}
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              {t("viewOriginal", { defaultValue: "Ver página original" })}
            </button>
          )}
        </footer>
      )}
    </div>
  );
}
