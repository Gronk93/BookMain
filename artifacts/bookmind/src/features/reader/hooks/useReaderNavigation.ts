import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { type ReaderLayout } from "./useReaderPreferences";

interface UseReaderNavigationOptions {
  totalPages: number;
  initialPage?: number;
  layout: ReaderLayout;
}

export function useReaderNavigation({
  totalPages,
  initialPage = 1,
  layout,
}: UseReaderNavigationOptions) {
  const hadInitialUrlPage = useRef<boolean>(Boolean(new URLSearchParams(window.location.search).get("page")));
  const hasUserNavigated = useRef(false);

  // Determine starting page: URL query ?page=N wins over initialPage
  const [currentPage, setCurrentPage] = useState<number>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qPage = parseInt(params.get("page") || "", 10);
      if (!isNaN(qPage) && qPage >= 1) {
        return qPage;
      }
    } catch {}
    return Math.max(1, initialPage || 1);
  });

  // Hydrate initialPage from progress when it loads from API
  useEffect(() => {
    if (!hasUserNavigated.current && !hadInitialUrlPage.current && initialPage > 1 && totalPages > 1) {
      setCurrentPage(Math.min(initialPage, totalPages));
    }
  }, [initialPage, totalPages]);

  // Clamp when totalPages becomes known or changes
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Synchronize URL query parameter without polluting browser history (replaceState)
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(currentPage));
      window.history.replaceState({}, "", url.toString());
    } catch {}
  }, [currentPage]);

  // In double spread:
  // Page 1 is solo (cover).
  // Next spreads are (2, 3), (4, 5), etc.
  // Left page is always even, right page is odd.
  const spreadPages = useMemo(() => {
    if (layout !== "double" || currentPage === 1) {
      return { left: currentPage, right: null };
    }
    const left = currentPage % 2 === 0 ? currentPage : currentPage - 1;
    const right = left + 1 <= totalPages ? left + 1 : null;
    return { left, right };
  }, [layout, currentPage, totalPages]);

  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const goToPage = useCallback(
    (page: number) => {
      if (isNaN(page)) return;
      hasUserNavigated.current = true;
      const safe = Math.max(1, Math.min(totalPages || 1, Math.floor(page)));
      setCurrentPage(safe);
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    if (!canGoNext) return;

    if (layout === "double") {
      if (currentPage === 1) {
        goToPage(2);
      } else {
        const currentLeft = currentPage % 2 === 0 ? currentPage : currentPage - 1;
        goToPage(currentLeft + 2);
      }
    } else {
      goToPage(currentPage + 1);
    }
  }, [canGoNext, layout, currentPage, goToPage]);

  const prevPage = useCallback(() => {
    if (!canGoPrev) return;

    if (layout === "double") {
      if (currentPage <= 3) {
        goToPage(1);
      } else {
        const currentLeft = currentPage % 2 === 0 ? currentPage : currentPage - 1;
        goToPage(currentLeft - 2);
      }
    } else {
      goToPage(currentPage - 1);
    }
  }, [canGoPrev, layout, currentPage, goToPage]);

  return {
    currentPage,
    spreadPages,
    canGoNext,
    canGoPrev,
    goToPage,
    nextPage,
    prevPage,
  };
}
