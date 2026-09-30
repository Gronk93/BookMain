import { useEffect, useRef, useCallback } from "react";
import { useUpdateReadingProgress } from "@workspace/api-client-react";

interface UseReadingProgressOptions {
  bookId: string;
  currentPage: number;
  totalPages: number;
}

export function useReadingProgress({
  bookId,
  currentPage,
  totalPages,
}: UseReadingProgressOptions) {
  const updateMutation = useUpdateReadingProgress();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedPage = useRef<number>(currentPage);

  const progressPercent = Math.round((currentPage / (totalPages || 1)) * 100);

  // Debounced progress update (800ms)
  useEffect(() => {
    if (!bookId || totalPages <= 0 || currentPage === lastPersistedPage.current) {
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      lastPersistedPage.current = currentPage;
      updateMutation.mutate({
        bookId,
        data: {
          currentPage,
          progressPercent,
          // Section 26: Do NOT set completed: true automatically
        },
      });
    }, 800);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [bookId, currentPage, totalPages, progressPercent, updateMutation]);

  const markCompleted = useCallback(
    (completed = true) => {
      if (!bookId) return;
      updateMutation.mutate({
        bookId,
        data: {
          currentPage,
          progressPercent: 100,
          completed,
        },
      });
    },
    [bookId, currentPage, updateMutation],
  );

  return {
    progressPercent,
    isUpdating: updateMutation.isPending,
    markCompleted,
  };
}
