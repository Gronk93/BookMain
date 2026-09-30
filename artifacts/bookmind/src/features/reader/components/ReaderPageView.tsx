import React from "react";
import { type BookPageDetail } from "@workspace/api-client-react";
import { OriginalPage } from "./OriginalPage";
import { ReflowPage } from "./ReflowPage";
import { type ReaderPreferences } from "../hooks/useReaderPreferences";

interface ReaderPageViewProps {
  bookId: string;
  pageNumber: number;
  pageData?: BookPageDetail | null;
  effectiveMode: "reading" | "original";
  preferences: ReaderPreferences;
  onSwitchToOriginal?: () => void;
  className?: string;
}

export function ReaderPageView({
  bookId,
  pageNumber,
  pageData,
  effectiveMode,
  preferences,
  onSwitchToOriginal,
  className = "",
}: ReaderPageViewProps) {
  if (effectiveMode === "original") {
    return (
      <div className={`w-full h-full flex items-center justify-center p-2 sm:p-4 ${className}`}>
        <OriginalPage
          bookId={bookId}
          pageNumber={pageNumber}
          zoom={preferences.zoom}
          rotation={pageData?.rotation ?? 0}
          width={pageData?.width}
          height={pageData?.height}
        />
      </div>
    );
  }

  return (
    <div className={`w-full min-h-[600px] flex justify-center ${className}`}>
      <ReflowPage
        pageNumber={pageNumber}
        normalizedText={pageData?.normalizedText}
        textBlocks={pageData?.textBlocks as any}
        qualityScore={pageData?.qualityScore}
        ocrStatus={pageData?.ocrStatus}
        isBlank={pageData?.isBlank}
        fontFamily={preferences.fontFamily}
        fontSize={preferences.fontSize}
        lineHeight={preferences.lineHeight}
        margin={preferences.margin}
        onSwitchToOriginal={onSwitchToOriginal}
      />
    </div>
  );
}
