import React from "react";
import { useTranslation } from "react-i18next";
import { NotebookPen } from "lucide-react";
import { StatCard } from "@/shared/components/StatCard";

interface WeeklyStatsProps {
  activeBooksCount?: number;
  notesCount?: number;
  highlightsCount?: number;
}

export function WeeklyStats({
  activeBooksCount = 3,
  notesCount = 14,
  highlightsCount = 28,
}: WeeklyStatsProps) {
  const { t } = useTranslation("library");

  return (
    <div className="rounded-3xl border border-border bg-card p-7 sm:p-10 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <p className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("thisWeek")}
          </p>
          <NotebookPen size={18} className="text-accent" />
        </div>
        <p className="serif mt-5 text-4xl leading-tight">
          {t("quietProgress")}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 border-t border-border pt-5">
        <StatCard value={activeBooksCount} label={t("activeBooks")} />
        <StatCard value={notesCount} label={t("notesMade")} />
        <StatCard value={highlightsCount} label={t("highlights")} />
      </div>
    </div>
  );
}
