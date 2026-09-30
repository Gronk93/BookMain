import React, { useEffect, useRef, useMemo } from "react";
import { useGetBookPage, getGetBookPageQueryKey } from "@workspace/api-client-react";
import { ReaderPageView } from "./ReaderPageView";
import { type ReaderPreferences } from "../hooks/useReaderPreferences";

interface ContinuousPageItemProps {
  bookId: string;
  pageNumber: number;
  preferences: ReaderPreferences;
  resolvePageMode: (page?: { pageType?: string; qualityScore?: number | null }) => "reading" | "original";
  onSwitchToOriginal?: () => void;
  onIntersect: (pageNumber: number) => void;
}

function ContinuousPageItem({
  bookId,
  pageNumber,
  preferences,
  resolvePageMode,
  onSwitchToOriginal,
  onIntersect,
}: ContinuousPageItemProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: pageData } = useGetBookPage(bookId, pageNumber, {
    query: {
      queryKey: getGetBookPageQueryKey(bookId, pageNumber),
      enabled: !!bookId && pageNumber > 0,
      staleTime: 60_000,
    },
  });

  const effectiveMode = resolvePageMode(pageData ?? undefined);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
            onIntersect(pageNumber);
          }
        }
      },
      {
        threshold: [0.4],
        rootMargin: "-10% 0px -10% 0px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onIntersect]);

  return (
    <div
      ref={containerRef}
      data-page-continuous={pageNumber}
      className="w-full flex flex-col items-center mb-12"
    >
      <div className="w-full max-w-3xl bg-card/40 rounded-2xl shadow-xs border border-border/30 overflow-hidden relative">
        {/* Subtle top page marker */}
        <div className="flex items-center justify-between px-6 py-2.5 border-b border-border/10 text-muted-foreground/60 text-xs font-mono">
          <span>Página {pageNumber}</span>
          {pageData?.pageType && (
            <span className="uppercase tracking-wider text-[10px] opacity-70">
              {pageData.pageType}
            </span>
          )}
        </div>

        <div className="py-4">
          <ReaderPageView
            bookId={bookId}
            pageNumber={pageNumber}
            pageData={pageData}
            effectiveMode={effectiveMode}
            preferences={preferences}
            onSwitchToOriginal={onSwitchToOriginal}
          />
        </div>
      </div>
    </div>
  );
}

interface ReaderContinuousViewProps {
  bookId: string;
  currentPage: number;
  totalPages: number;
  preferences: ReaderPreferences;
  resolvePageMode: (page?: { pageType?: string; qualityScore?: number | null }) => "reading" | "original";
  onPageVisible: (pageNumber: number) => void;
  onSwitchToOriginal?: () => void;
  className?: string;
}

export function ReaderContinuousView({
  bookId,
  currentPage,
  totalPages,
  preferences,
  resolvePageMode,
  onPageVisible,
  onSwitchToOriginal,
  className = "",
}: ReaderContinuousViewProps) {
  // Window of pages: [max(1, currentPage - 2) .. min(totalPages, currentPage + 2)]
  const windowPages = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    const pages: number[] = [];
    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className={`w-full flex flex-col items-center px-4 py-6 ${className}`}>
      {windowPages.map((pageNum) => (
        <ContinuousPageItem
          key={pageNum}
          bookId={bookId}
          pageNumber={pageNum}
          preferences={preferences}
          resolvePageMode={resolvePageMode}
          onSwitchToOriginal={onSwitchToOriginal}
          onIntersect={onPageVisible}
        />
      ))}
    </div>
  );
}
