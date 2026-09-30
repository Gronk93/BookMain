import React, { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PageNavigatorProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: number;
  totalPages: number;
  onGoToPage: (page: number) => void;
}

export function PageNavigator({
  isOpen,
  onClose,
  currentPage,
  totalPages,
  onGoToPage,
}: PageNavigatorProps) {
  const { t } = useTranslation(["reader", "common"]);
  const [inputVal, setInputVal] = useState<string>(String(currentPage));
  const [sliderVal, setSliderVal] = useState<number>(currentPage);

  useEffect(() => {
    if (isOpen) {
      setInputVal(String(currentPage));
      setSliderVal(currentPage);
    }
  }, [isOpen, currentPage]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(inputVal, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onGoToPage(pageNum);
      onClose();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setSliderVal(val);
    setInputVal(String(val));
  };

  const handleSliderCommit = () => {
    onGoToPage(sliderVal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-xl p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-medium text-foreground">
            {t("goToPage", { defaultValue: "Ir a página" })}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              const p = parseInt(e.target.value, 10);
              if (!isNaN(p) && p >= 1 && p <= totalPages) {
                setSliderVal(p);
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
            placeholder={`1 - ${totalPages}`}
            autoFocus
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-3.5 py-2 text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-1 shrink-0"
          >
            <span>{t("go", { defaultValue: "Ir" })}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        {/* Mini Slider Scrubber (Section 19) */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-border/40">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>1</span>
            <span className="font-medium text-foreground">
              {sliderVal} / {totalPages}
            </span>
            <span>{totalPages}</span>
          </div>
          <input
            type="range"
            min={1}
            max={totalPages}
            value={sliderVal}
            onChange={handleSliderChange}
            onMouseUp={handleSliderCommit}
            onTouchEnd={handleSliderCommit}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
      </div>
    </div>
  );
}
