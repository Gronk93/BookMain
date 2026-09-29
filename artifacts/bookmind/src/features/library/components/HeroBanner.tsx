import React from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { formatHeaderDate } from "@/shared/utils/date";

interface HeroBannerProps {
  onAddBook: () => void;
}

export function HeroBanner({ onAddBook }: HeroBannerProps) {
  const { t, i18n } = useTranslation("library");
  const { t: tc } = useTranslation("common");

  const todayStr = formatHeaderDate(new Date(), i18n.language);

  return (
    <section className="animate-rise-in flex flex-col justify-between gap-8 border-b border-border/70 pb-10 pt-8 sm:flex-row sm:items-end sm:pt-14">
      <div>
        <p className="mono mb-4 text-[10px] uppercase tracking-[0.2em] text-primary">
          {todayStr}
        </p>
        <h1 className="serif max-w-xl text-5xl leading-[0.95] tracking-[-0.04em] sm:text-6xl">
          {tc("tagline")}
        </h1>
        <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <button
        onClick={onAddBook}
        className="flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
      >
        <Plus size={17} /> {t("addBook")}
      </button>
    </section>
  );
}
