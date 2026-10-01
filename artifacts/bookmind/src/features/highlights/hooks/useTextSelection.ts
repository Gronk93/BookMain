import { useState, useEffect, useCallback, useRef } from "react";
import { type TextSelectionData, type BoundingBox } from "../types";

/**
 * Calculates character offset of a node and offset within a parent block element.
 */
function getOffsetInBlock(blockEl: HTMLElement, targetNode: Node, targetOffset: number): number {
  let charCount = 0;
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT, null);

  let current = walker.nextNode();
  while (current) {
    if (current === targetNode) {
      return charCount + targetOffset;
    }
    charCount += current.textContent?.length || 0;
    current = walker.nextNode();
  }

  return charCount;
}

export function useTextSelection(containerRef: React.RefObject<HTMLElement | null>) {
  const [selectionData, setSelectionData] = useState<TextSelectionData | null>(null);
  const isMouseDownRef = useRef(false);

  const handleSelection = useCallback(() => {
    if (isMouseDownRef.current) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelectionData(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();

    if (!text || text.length > 10000) {
      setSelectionData(null);
      return;
    }

    // Check if selection is within the reader container
    if (containerRef.current && !containerRef.current.contains(range.commonAncestorContainer)) {
      setSelectionData(null);
      return;
    }

    // Find the enclosing page elements
    const startNode = range.startContainer;
    const endNode = range.endContainer;

    const startEl = (startNode.nodeType === Node.ELEMENT_NODE
      ? startNode
      : startNode.parentElement) as HTMLElement | null;
    const endEl = (endNode.nodeType === Node.ELEMENT_NODE
      ? endNode
      : endNode.parentElement) as HTMLElement | null;

    const startPageEl = startEl?.closest("[data-page-number]") as HTMLElement | null;
    const endPageEl = endEl?.closest("[data-page-number]") as HTMLElement | null;

    if (!startPageEl || !endPageEl) {
      setSelectionData(null);
      return;
    }

    const startPage = parseInt(startPageEl.getAttribute("data-page-number") || "0", 10);
    const endPage = parseInt(endPageEl.getAttribute("data-page-number") || "0", 10);

    // Enforce 1-page selection limit (Section 15 & PRD BM-06: no multi-page selections)
    if (startPage !== endPage || startPage === 0) {
      setSelectionData(null);
      return;
    }

    // Find block elements
    const startBlockEl = startEl?.closest("[data-block-id]") as HTMLElement | null;
    const endBlockEl = endEl?.closest("[data-block-id]") as HTMLElement | null;

    const startBlockId = startBlockEl?.getAttribute("data-block-id") || "b-0";
    const endBlockId = endBlockEl?.getAttribute("data-block-id") || startBlockId;

    const startOffset = startBlockEl
      ? getOffsetInBlock(startBlockEl, range.startContainer, range.startOffset)
      : range.startOffset;

    const endOffset = endBlockEl
      ? getOffsetInBlock(endBlockEl, range.endContainer, range.endOffset)
      : range.endOffset;

    // Get context strings
    const fullStartBlockText = startBlockEl?.textContent || "";
    const fullEndBlockText = endBlockEl?.textContent || "";

    const prefixText = fullStartBlockText.slice(Math.max(0, startOffset - 48), startOffset);
    const suffixText = fullEndBlockText.slice(endOffset, endOffset + 48);

    // Compute bounding client rect for toolbar positioning
    const rect = range.getBoundingClientRect();
    const clientRects = Array.from(range.getClientRects());
    const boundingBoxes: BoundingBox[] = clientRects.map((r) => ({
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
    }));

    setSelectionData({
      pageNumber: startPage,
      startBlockId,
      startOffset,
      endBlockId,
      endOffset,
      exactText: text,
      prefixText,
      suffixText,
      boundingBoxes,
      position: {
        top: Math.max(10, rect.top - 54),
        left: rect.left + rect.width / 2,
      },
    });
  }, [containerRef]);

  const clearSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel) sel.removeAllRanges();
    setSelectionData(null);
  }, []);

  useEffect(() => {
    const onMouseDown = () => {
      isMouseDownRef.current = true;
    };

    const onMouseUp = () => {
      isMouseDownRef.current = false;
      setTimeout(handleSelection, 20);
    };

    const onSelectionChange = () => {
      if (!isMouseDownRef.current) {
        handleSelection();
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [handleSelection]);

  return {
    selectionData,
    clearSelection,
  };
}
