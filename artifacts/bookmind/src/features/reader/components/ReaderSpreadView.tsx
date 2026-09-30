import React from "react";
import { useGetBookPage, getGetBookPageQueryKey, type BookPageDetail } from "@workspace/api-client-react";
import { ReaderPageView } from "./ReaderPageView";
import { type ReaderPreferences } from "../hooks/useReaderPreferences";

interface ReaderSpreadViewProps {
  bookId: string;
  leftPageNumber: number;
  rightPageNumber: number | null;
  leftPageData?: BookPageDetail | null;
  preferences: ReaderPreferences;
  resolvePageMode: (page?: { pageType?: string; qualityScore?: number | null }) => "reading" | "original";
  onSwitchToOriginal?: () => void;
  className?: string;
}

export function ReaderSpreadView({
  bookId,
  leftPageNumber,
  rightPageNumber,
  leftPageData,
  preferences,
  resolvePageMode,
  onSwitchToOriginal,
  className = "",
}: ReaderSpreadViewProps) {
  // Query right page data if rightPageNumber exists
  const { data: rightPageData } = useGetBookPage(
    bookId,
    rightPageNumber ?? 0,
    {
      query: {
        queryKey: getGetBookPageQueryKey(bookId, rightPageNumber ?? 0),
        enabled: !!bookId && rightPageNumber !== null && rightPageNumber > 0,
        staleTime: 60_000,
      },
    },
  );

  const leftMode = resolvePageMode(leftPageData ?? undefined);
  const rightMode = resolvePageMode(rightPageData ?? undefined);

  // If left page is 1 (Cover), show single centered page
  if (leftPageNumber === 1 || rightPageNumber === null) {
    return (
      <div className={`w-full flex justify-center items-center py-4 ${className}`}>
        <div className="w-full max-w-2xl bg-card/40 rounded-xl shadow-xs border border-border/30 overflow-hidden">
          <ReaderPageView
            bookId={bookId}
            pageNumber={leftPageNumber}
            pageData={leftPageData}
            effectiveMode={leftMode}
            preferences={preferences}
            onSwitchToOriginal={onSwitchToOriginal}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col md:flex-row items-stretch justify-center gap-2 md:gap-0 max-w-6xl mx-auto py-4 ${className}`}>
      {/* Left Page (Even) */}
      <div className="flex-1 w-full bg-card/40 rounded-t-xl md:rounded-l-xl md:rounded-tr-none shadow-xs border border-border/30 md:border-r-0 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-border/10 text-right text-[10px] text-muted-foreground/60 font-mono">
          {leftPageNumber}
        </div>
        <div className="flex-1 overflow-auto">
          <ReaderPageView
            bookId={bookId}
            pageNumber={leftPageNumber}
            pageData={leftPageData}
            effectiveMode={leftMode}
            preferences={preferences}
            onSwitchToOriginal={onSwitchToOriginal}
          />
        </div>
      </div>

      {/* Book Gutter / Spine Shadow */}
      <div className="hidden md:block w-px bg-border/40 shadow-[0_0_12px_rgba(0,0,0,0.08)] z-10" />

      {/* Right Page (Odd) */}
      <div className="flex-1 w-full bg-card/40 rounded-b-xl md:rounded-r-xl md:rounded-bl-none shadow-xs border border-border/30 md:border-l-0 overflow-hidden flex flex-col">
        <div className="px-4 py-2 border-b border-border/10 text-left text-[10px] text-muted-foreground/60 font-mono">
          {rightPageNumber}
        </div>
        <div className="flex-1 overflow-auto">
          <ReaderPageView
            bookId={bookId}
            pageNumber={rightPageNumber}
            pageData={rightPageData}
            effectiveMode={rightMode}
            preferences={preferences}
            onSwitchToOriginal={onSwitchToOriginal}
          />
        </div>
      </div>
    </div>
  );
}
