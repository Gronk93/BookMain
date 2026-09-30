import { useState, useEffect, useCallback } from "react";
import { useGetCurrentUser, useUpdateUserPreferences } from "@workspace/api-client-react";

export type ReaderViewMode = "auto" | "reading" | "original";
export type ReaderLayout = "single" | "double" | "continuous";
export type ReaderTheme = "paper" | "sepia" | "night";
export type ReaderFontFamily = "serif" | "sans";
export type ReaderLineHeight = "compact" | "normal" | "relaxed";
export type ReaderMargin = "narrow" | "normal" | "wide";
export type ReaderPageAnimation = "page" | "slide" | "none";

export interface ReaderPreferences {
  viewMode: ReaderViewMode;
  layout: ReaderLayout;
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  fontSize: number; // 14 to 28
  lineHeight: ReaderLineHeight;
  margin: ReaderMargin;
  pageAnimation: ReaderPageAnimation;
  zoom: number; // 50 to 200
}

const DEFAULT_PREFERENCES: ReaderPreferences = {
  viewMode: "auto",
  layout: "single",
  theme: "paper",
  fontFamily: "serif",
  fontSize: 18,
  lineHeight: "normal",
  margin: "normal",
  pageAnimation: "page",
  zoom: 100,
};

const STORAGE_KEY = "bookmind-reader-preferences";

function loadLocalPreferences(): ReaderPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function saveLocalPreferences(prefs: ReaderPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}

export function useReaderPreferences() {
  const { data: userProfile } = useGetCurrentUser();
  const updateMutation = useUpdateUserPreferences();

  const [preferences, setPreferences] = useState<ReaderPreferences>(() => {
    return loadLocalPreferences();
  });

  // Sync when user profile loads from server
  useEffect(() => {
    const p = userProfile?.preferences;
    if (p) {
      setPreferences((prev) => {
        const next: ReaderPreferences = {
          viewMode: (p.readerViewMode as ReaderViewMode) || prev.viewMode || "auto",
          layout: (p.readerLayout as ReaderLayout) || prev.layout || "single",
          theme: (p.readerTheme as ReaderTheme) || prev.theme || "paper",
          fontFamily: (p.readerFontFamily as ReaderFontFamily) || prev.fontFamily || "serif",
          fontSize: p.readerFontSize || prev.fontSize || 18,
          lineHeight: (p.readerLineHeight as ReaderLineHeight) || prev.lineHeight || "normal",
          margin: (p.readerMargin as ReaderMargin) || prev.margin || "normal",
          pageAnimation: (p.readerPageAnimation as ReaderPageAnimation) || prev.pageAnimation || "page",
          zoom: p.readerZoom || prev.zoom || 100,
        };
        saveLocalPreferences(next);
        return next;
      });
    }
  }, [userProfile]);

  const updatePreferences = useCallback(
    (updates: Partial<ReaderPreferences>) => {
      setPreferences((prev) => {
        const next = { ...prev, ...updates };
        saveLocalPreferences(next);

        // Sync to server asynchronously
        updateMutation.mutate({
          data: {
            ...(updates.viewMode !== undefined ? { readerViewMode: updates.viewMode } : {}),
            ...(updates.layout !== undefined ? { readerLayout: updates.layout } : {}),
            ...(updates.theme !== undefined ? { readerTheme: updates.theme } : {}),
            ...(updates.fontFamily !== undefined ? { readerFontFamily: updates.fontFamily } : {}),
            ...(updates.fontSize !== undefined ? { readerFontSize: updates.fontSize } : {}),
            ...(updates.lineHeight !== undefined ? { readerLineHeight: updates.lineHeight } : {}),
            ...(updates.margin !== undefined ? { readerMargin: updates.margin } : {}),
            ...(updates.pageAnimation !== undefined ? { readerPageAnimation: updates.pageAnimation } : {}),
            ...(updates.zoom !== undefined ? { readerZoom: updates.zoom } : {}),
          },
        });

        return next;
      });
    },
    [updateMutation],
  );

  /**
   * Resolves whether the current page should render in Reflow or Original mode.
   * Section 8 rule:
   * - Manual selection wins ('reading' or 'original')
   * - Auto mode: Scanned, Hybrid, or Quality < 70 -> 'original'
   * - Auto mode: Digital & Quality >= 70 -> 'reading'
   */
  const resolvePageMode = useCallback(
    (page?: { pageType?: string; qualityScore?: number | null }): "reading" | "original" => {
      if (preferences.viewMode === "reading") return "reading";
      if (preferences.viewMode === "original") return "original";

      // Auto mode decision
      if (!page) return "reading";
      const isScanned = page.pageType === "scanned";
      const isHybrid = page.pageType === "hybrid";
      const isLowConfidence = typeof page.qualityScore === "number" && page.qualityScore < 70;

      if (isScanned || isHybrid || isLowConfidence) {
        return "original";
      }

      return "reading";
    },
    [preferences.viewMode],
  );

  return {
    preferences,
    updatePreferences,
    resolvePageMode,
  };
}
