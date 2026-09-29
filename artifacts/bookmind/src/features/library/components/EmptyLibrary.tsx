import React from "react";
import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";

export function EmptyLibrary({ isSearch = false }: { isSearch?: boolean }) {
  const { t } = useTranslation("library");

  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
      <BookOpen size={32} className="mx-auto mb-3 text-muted-foreground/50" />
      <p>{isSearch ? t("noBooksMatch") : t("emptyLibrary")}</p>
    </div>
  );
}
