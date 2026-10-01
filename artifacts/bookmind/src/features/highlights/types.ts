export type HighlightColor = "yellow" | "green" | "blue" | "red" | "violet";

export type HighlightCategory =
  | "important"
  | "learned"
  | "example"
  | "not_understood"
  | "review";

export type HighlightAnchorStatus =
  | "resolved"
  | "recovered"
  | "needs_review"
  | "orphaned";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  userId: string;
  bookId: string;
  pageNumber: number;
  anchorVersion: number;
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
  exactText: string;
  prefixText?: string | null;
  suffixText?: string | null;
  textHash: string;
  color: HighlightColor;
  category?: HighlightCategory | null;
  anchorStatus: HighlightAnchorStatus;
  boundingBoxes?: BoundingBox[] | null;
  noteCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TextSelectionData {
  pageNumber: number;
  startBlockId: string;
  startOffset: number;
  endBlockId: string;
  endOffset: number;
  exactText: string;
  prefixText: string;
  suffixText: string;
  boundingBoxes?: BoundingBox[];
  position: { top: number; left: number };
}

export const COLOR_CONFIG: Record<
  HighlightColor,
  {
    nameKey: string;
    category: HighlightCategory;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    hex: string;
  }
> = {
  yellow: {
    nameKey: "colors.yellow",
    category: "important",
    bgClass: "bg-yellow-200/60 dark:bg-yellow-500/30 text-yellow-950 dark:text-yellow-100",
    borderClass: "border-yellow-400 dark:border-yellow-600",
    badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
    hex: "#facc15",
  },
  green: {
    nameKey: "colors.green",
    category: "learned",
    bgClass: "bg-emerald-200/60 dark:bg-emerald-500/30 text-emerald-950 dark:text-emerald-100",
    borderClass: "border-emerald-400 dark:border-emerald-600",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    hex: "#34d399",
  },
  blue: {
    nameKey: "colors.blue",
    category: "example",
    bgClass: "bg-sky-200/60 dark:bg-sky-500/30 text-sky-950 dark:text-sky-100",
    borderClass: "border-sky-400 dark:border-sky-600",
    badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    hex: "#38bdf8",
  },
  red: {
    nameKey: "colors.red",
    category: "not_understood",
    bgClass: "bg-rose-200/60 dark:bg-rose-500/30 text-rose-950 dark:text-rose-100",
    borderClass: "border-rose-400 dark:border-rose-600",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    hex: "#fb7185",
  },
  violet: {
    nameKey: "colors.violet",
    category: "review",
    bgClass: "bg-purple-200/60 dark:bg-purple-500/30 text-purple-950 dark:text-purple-100",
    borderClass: "border-purple-400 dark:border-purple-600",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200",
    hex: "#c084fc",
  },
};
