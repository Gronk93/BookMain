import React from "react";
import { type Highlight, COLOR_CONFIG } from "../types";

interface TextBlockItem {
  id?: string;
  text: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  bbox?: { x: number; y: number; width: number; height: number };
}

interface TextLayerProps {
  pageNumber: number;
  textBlocks?: TextBlockItem[] | null;
  pageWidth?: number | null;
  pageHeight?: number | null;
  highlights?: Highlight[];
  onHighlightClick?: (highlight: Highlight, event: React.MouseEvent) => void;
}

export function TextLayer({
  pageNumber,
  textBlocks,
  pageWidth = 612,
  pageHeight = 792,
  highlights = [],
  onHighlightClick,
}: TextLayerProps) {
  if (!textBlocks || textBlocks.length === 0) return null;

  const w = pageWidth || 612;
  const h = pageHeight || 792;

  return (
    <div
      className="absolute inset-0 select-text overflow-hidden pointer-events-auto"
      style={{
        width: "100%",
        height: "100%",
      }}
      data-page-number={pageNumber}
    >
      {/* 1. Visual Highlights Overlay */}
      {highlights.map((hl) => {
        if (!hl.boundingBoxes || hl.boundingBoxes.length === 0) return null;
        const cfg = COLOR_CONFIG[hl.color] || COLOR_CONFIG.yellow;

        return hl.boundingBoxes.map((box, bIdx) => (
          <div
            key={`overlay-${hl.id}-${bIdx}`}
            onClick={(e) => onHighlightClick?.(hl, e)}
            className="absolute cursor-pointer transition-opacity opacity-40 hover:opacity-60 rounded-xs"
            style={{
              left: `${(box.x / w) * 100}%`,
              top: `${(box.y / h) * 100}%`,
              width: `${(box.width / w) * 100}%`,
              height: `${(box.height / h) * 100}%`,
              backgroundColor: cfg.hex,
            }}
            title={hl.exactText}
          />
        ));
      })}

      {/* 2. Selectable Transparent Text Layer */}
      {textBlocks.map((block, idx) => {
        const box = block.bbox || {
          x: block.x || 0,
          y: block.y || 0,
          width: block.width || 0,
          height: block.height || 0,
        };

        const leftPercent = (box.x / w) * 100;
        const topPercent = (box.y / h) * 100;
        const widthPercent = (box.width / w) * 100;
        const heightPercent = (box.height / h) * 100;

        return (
          <span
            key={block.id || `layer-block-${idx}`}
            data-block-id={block.id || `b-${idx}`}
            className="absolute text-transparent select-text cursor-text"
            style={{
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              width: widthPercent > 0 ? `${widthPercent}%` : "auto",
              height: heightPercent > 0 ? `${heightPercent}%` : "auto",
              fontSize: box.height ? `${box.height * 0.75}px` : "14px",
              lineHeight: 1,
            }}
          >
            {block.text}
          </span>
        );
      })}
    </div>
  );
}
