import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBookPageQueryKey, getBookPage } from "@workspace/api-client-react";

interface UsePagePrefetchOptions {
  bookId: string;
  currentPage: number;
  totalPages: number;
}

export function usePagePrefetch({
  bookId,
  currentPage,
  totalPages,
}: UsePagePrefetchOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookId || totalPages <= 0) return;

    // Prefetch window: [currentPage - 1, currentPage + 1, currentPage + 2]
    const candidates = [currentPage - 1, currentPage + 1, currentPage + 2].filter(
      (p) => p >= 1 && p <= totalPages,
    );

    for (const pageNumber of candidates) {
      // 1. Prefetch page data JSON
      const queryKey = getGetBookPageQueryKey(bookId, pageNumber);
      queryClient.prefetchQuery({
        queryKey,
        queryFn: () => getBookPage(bookId, pageNumber),
        staleTime: 1000 * 60 * 5, // 5 min cache
      });

      // 2. Pre-cache preview image into browser cache
      const img = new Image();
      img.src = `/api/books/${bookId}/pages/${pageNumber}/preview`;
    }
  }, [bookId, currentPage, totalPages, queryClient]);
}
