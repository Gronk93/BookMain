import { type BookPageDetail } from "@workspace/api-client-react";
import { OriginalPage } from "./OriginalPage";
import { ReflowPage } from "./ReflowPage";
import { type ReaderPreferences } from "../hooks/useReaderPreferences";
import { type Highlight } from "@/features/highlights/types";

interface ReaderPageViewProps {
  bookId: string;
  pageNumber: number;
  pageData?: BookPageDetail | null;
  effectiveMode: "reading" | "original";
  preferences: ReaderPreferences;
  highlights?: Highlight[];
  onHighlightClick?: (highlight: Highlight, event: React.MouseEvent) => void;
  onSwitchToOriginal?: () => void;
  className?: string;
}

export function ReaderPageView({
  bookId,
  pageNumber,
  pageData,
  effectiveMode,
  preferences,
  highlights = [],
  onHighlightClick,
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
          textBlocks={pageData?.textBlocks as any}
          highlights={highlights}
          onHighlightClick={onHighlightClick}
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
        highlights={highlights}
        onHighlightClick={onHighlightClick}
        onSwitchToOriginal={onSwitchToOriginal}
      />
    </div>
  );
}
