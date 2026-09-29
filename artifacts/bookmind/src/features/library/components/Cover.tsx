import React from "react";

export interface BookCoverProps {
  title: string;
  label?: string;
  color?: string;
  accent?: string;
  compact?: boolean;
}

const DEFAULT_COLOR = "#315653";
const DEFAULT_ACCENT = "#D3A16E";

export function Cover({
  title,
  label,
  color = DEFAULT_COLOR,
  accent = DEFAULT_ACCENT,
  compact = false,
}: BookCoverProps) {
  const displayLabel = label || title.slice(0, 10).toUpperCase();

  return (
    <div
      className={`book-cover relative overflow-hidden rounded-[4px] text-white shadow-lg shrink-0 ${
        compact ? "h-40 w-28" : "h-64 w-44 sm:h-72 sm:w-48"
      }`}
      style={{
        background: `linear-gradient(145deg, ${color || DEFAULT_COLOR}, #1d3031)`,
      }}
    >
      <div className="absolute inset-3 border border-white/25 pointer-events-none" />
      <div className="relative flex h-full flex-col justify-between p-4 sm:p-5">
        <span className="font-mono text-[9px] tracking-[0.24em] text-white/70">
          BOOKMIND EDITION
        </span>
        <div>
          <div
            className="mb-3 sm:mb-4 h-1 w-9"
            style={{ backgroundColor: accent || DEFAULT_ACCENT }}
          />
          <p className={`serif leading-none font-medium ${compact ? "text-lg" : "text-3xl"}`}>
            {displayLabel}
          </p>
          <p className="mt-2.5 max-w-[12ch] font-mono text-[8px] uppercase tracking-[0.16em] text-white/70 line-clamp-2">
            {title}
          </p>
        </div>
      </div>
    </div>
  );
}
