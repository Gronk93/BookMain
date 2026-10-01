import React from "react";
import { type Highlight, COLOR_CONFIG } from "../types";

interface AnchorRendererProps {
  blockId: string;
  blockText: string;
  highlights?: Highlight[];
  onHighlightClick?: (highlight: Highlight, event: React.MouseEvent) => void;
}

interface BlockInterval {
  start: number;
  end: number;
  highlight: Highlight;
}

export function AnchorRenderer({
  blockId,
  blockText,
  highlights = [],
  onHighlightClick,
}: AnchorRendererProps) {
  if (!highlights || highlights.length === 0 || !blockText) {
    return <>{blockText}</>;
  }

  // Find intervals relevant to this block
  const intervals: BlockInterval[] = [];

  for (const h of highlights) {
    const isStart = h.startBlockId === blockId;
    const isEnd = h.endBlockId === blockId;

    if (!isStart && !isEnd) {
      continue;
    }

    let start = 0;
    let end = blockText.length;

    if (isStart && isEnd) {
      start = Math.max(0, Math.min(blockText.length, h.startOffset));
      end = Math.max(start, Math.min(blockText.length, h.endOffset));
    } else if (isStart) {
      start = Math.max(0, Math.min(blockText.length, h.startOffset));
      end = blockText.length;
    } else if (isEnd) {
      start = 0;
      end = Math.max(0, Math.min(blockText.length, h.endOffset));
    }

    if (start < end) {
      intervals.push({ start, end, highlight: h });
    }
  }

  if (intervals.length === 0) {
    return <>{blockText}</>;
  }

  // Sort intervals by start offset
  intervals.sort((a, b) => a.start - b.start || a.end - b.end);

  const elements: React.ReactNode[] = [];
  let currentIdx = 0;

  for (let i = 0; i < intervals.length; i++) {
    const { start, end, highlight } = intervals[i];

    // Non-highlighted text before this interval
    if (start > currentIdx) {
      elements.push(
        <span key={`text-${blockId}-${currentIdx}`}>{blockText.slice(currentIdx, start)}</span>,
      );
    }

    // Highlighted segment
    const segmentStart = Math.max(currentIdx, start);
    if (segmentStart < end) {
      const cfg = COLOR_CONFIG[highlight.color] || COLOR_CONFIG.yellow;
      const needsReview = highlight.anchorStatus === "needs_review";
      const hasNotes = typeof highlight.noteCount === "number" && highlight.noteCount > 0;

      elements.push(
        <mark
          key={`hl-${highlight.id}-${segmentStart}`}
          onClick={(e) => {
            e.stopPropagation();
            onHighlightClick?.(highlight, e);
          }}
          className={`cursor-pointer rounded-xs px-0.5 transition-colors relative inline ${
            cfg.bgClass
          } ${
            needsReview
              ? "border-b-2 border-dashed border-amber-500"
              : "hover:brightness-95 dark:hover:brightness-110"
          }`}
          data-highlight-id={highlight.id}
          data-anchor-status={highlight.anchorStatus}
        >
          {blockText.slice(segmentStart, end)}
          {/* Note attachment indicator dot */}
          {hasNotes && (
            <span
              className="inline-block ml-1 align-top text-[10px] text-accent font-bold select-none cursor-pointer"
              title={`${highlight.noteCount} nota(s)`}
            >
              ●
            </span>
          )}
        </mark>,
      );
      currentIdx = end;
    }
  }

  // Trailing normal text
  if (currentIdx < blockText.length) {
    elements.push(
      <span key={`text-${blockId}-${currentIdx}`}>{blockText.slice(currentIdx)}</span>,
    );
  }

  return <>{elements}</>;
}
