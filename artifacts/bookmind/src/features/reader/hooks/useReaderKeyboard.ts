import { useEffect } from "react";

interface UseReaderKeyboardOptions {
  onNext: () => void;
  onPrev: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}

export function useReaderKeyboard({
  onNext,
  onPrev,
  onEscape,
  enabled = true,
}: UseReaderKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not capture keystrokes when typing in inputs or textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        onNext();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        onPrev();
      } else if (e.key === " " && !e.shiftKey) {
        e.preventDefault();
        onNext();
      } else if (e.key === " " && e.shiftKey) {
        e.preventDefault();
        onPrev();
      } else if (e.key === "Escape") {
        onEscape?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev, onEscape, enabled]);
}
