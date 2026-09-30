import React from "react";
import { X, Sparkles, BookOpen, Layers, Type, Sliders, Palette } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  type ReaderPreferences,
  type ReaderViewMode,
  type ReaderLayout,
  type ReaderTheme,
  type ReaderFontFamily,
  type ReaderLineHeight,
  type ReaderMargin,
  type ReaderPageAnimation,
} from "../hooks/useReaderPreferences";

interface ReaderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onUpdatePreferences: (updates: Partial<ReaderPreferences>) => void;
}

export function ReaderSettings({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
}: ReaderSettingsProps) {
  const { t } = useTranslation(["reader", "settings", "common"]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Settings Drawer (Desktop: right side drawer, Mobile: responsive panel) */}
      <div className="relative w-full max-w-md bg-card border-l border-border h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-card/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-primary" />
            <h2 className="font-serif text-lg font-medium text-foreground">
              {t("readerSettings", { defaultValue: "Ajustes de lectura" })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-7">
          {/* 1. Vista / View Mode (Section 7-8) */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen size={13} />
              <span>{t("viewMode", { defaultValue: "Modo de vista" })}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["auto", "reading", "original"] as ReaderViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdatePreferences({ viewMode: mode })}
                  className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition-all ${
                    preferences.viewMode === mode
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {mode === "auto" && t("modeAuto", { defaultValue: "Automático" })}
                  {mode === "reading" && t("modeReading", { defaultValue: "Lectura" })}
                  {mode === "original" && t("modeOriginal", { defaultValue: "Original" })}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Diseño / Layout (Section 9-10) */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers size={13} />
              <span>{t("layout", { defaultValue: "Diseño de página" })}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["single", "double", "continuous"] as ReaderLayout[]).map((layout) => (
                <button
                  key={layout}
                  onClick={() => onUpdatePreferences({ layout })}
                  className={`rounded-xl border py-2.5 px-2 text-xs font-medium transition-all ${
                    preferences.layout === layout
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {layout === "single" && t("layoutSingle", { defaultValue: "Página única" })}
                  {layout === "double" && t("layoutDouble", { defaultValue: "Doble página" })}
                  {layout === "continuous" && t("layoutContinuous", { defaultValue: "Continua" })}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Tema del lector / Reader Theme (Section 43-46) */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Palette size={13} />
              <span>{t("readerTheme", { defaultValue: "Tema del lector" })}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onUpdatePreferences({ theme: "paper" })}
                className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition-all flex flex-col items-center gap-1.5 ${
                  preferences.theme === "paper"
                    ? "border-amber-600 ring-2 ring-amber-500/20"
                    : "border-border/60 hover:opacity-90"
                }`}
                style={{ backgroundColor: "#FBF7EE", color: "#2A241E" }}
              >
                <span className="font-serif">Aa</span>
                <span className="text-[11px]">{t("themePaper", { defaultValue: "Papel" })}</span>
              </button>

              <button
                onClick={() => onUpdatePreferences({ theme: "sepia" })}
                className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition-all flex flex-col items-center gap-1.5 ${
                  preferences.theme === "sepia"
                    ? "border-amber-700 ring-2 ring-amber-700/20"
                    : "border-border/60 hover:opacity-90"
                }`}
                style={{ backgroundColor: "#F4ECD8", color: "#382C1E" }}
              >
                <span className="font-serif">Aa</span>
                <span className="text-[11px]">{t("themeSepia", { defaultValue: "Sepia" })}</span>
              </button>

              <button
                onClick={() => onUpdatePreferences({ theme: "night" })}
                className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition-all flex flex-col items-center gap-1.5 ${
                  preferences.theme === "night"
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border/60 hover:opacity-90"
                }`}
                style={{ backgroundColor: "#16171A", color: "#D8DADF" }}
              >
                <span className="font-serif">Aa</span>
                <span className="text-[11px]">{t("themeNight", { defaultValue: "Noche" })}</span>
              </button>
            </div>
          </div>

          {/* 4. Tipografía / Typography (Section 38) */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Type size={13} />
              <span>{t("fontFamily", { defaultValue: "Tipografía" })}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["serif", "sans"] as ReaderFontFamily[]).map((f) => (
                <button
                  key={f}
                  onClick={() => onUpdatePreferences({ fontFamily: f })}
                  className={`rounded-xl border py-2.5 px-3 text-xs font-medium transition-all ${
                    f === "serif" ? "font-serif" : "font-sans"
                  } ${
                    preferences.fontFamily === f
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {f === "serif" ? "Serif (Editorial)" : "Sans (Moderno)"}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Tamaño de texto / Font Size (Section 39) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wider text-muted-foreground">
                {t("fontSize", { defaultValue: "Tamaño de texto" })}
              </span>
              <span className="font-mono text-foreground font-medium">
                {preferences.fontSize}px
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">A</span>
              <input
                type="range"
                min={14}
                max={28}
                value={preferences.fontSize}
                onChange={(e) =>
                  onUpdatePreferences({ fontSize: parseInt(e.target.value, 10) })
                }
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-lg font-medium text-foreground">A</span>
            </div>
          </div>

          {/* 6. Interlineado / Line Height (Section 40) */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("lineHeight", { defaultValue: "Interlineado" })}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["compact", "normal", "relaxed"] as ReaderLineHeight[]).map((lh) => (
                <button
                  key={lh}
                  onClick={() => onUpdatePreferences({ lineHeight: lh })}
                  className={`rounded-xl border py-2 px-2 text-xs font-medium transition-all ${
                    preferences.lineHeight === lh
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {lh === "compact" && t("compact", { defaultValue: "Compacto" })}
                  {lh === "normal" && t("normal", { defaultValue: "Normal" })}
                  {lh === "relaxed" && t("relaxed", { defaultValue: "Amplio" })}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Márgenes / Margins (Section 41) */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("margins", { defaultValue: "Márgenes" })}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["narrow", "normal", "wide"] as ReaderMargin[]).map((m) => (
                <button
                  key={m}
                  onClick={() => onUpdatePreferences({ margin: m })}
                  className={`rounded-xl border py-2 px-2 text-xs font-medium transition-all ${
                    preferences.margin === m
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {m === "narrow" && t("narrow", { defaultValue: "Estrecho" })}
                  {m === "normal" && t("normal", { defaultValue: "Normal" })}
                  {m === "wide" && t("wide", { defaultValue: "Amplio" })}
                </button>
              ))}
            </div>
          </div>

          {/* 8. Transición / Page Animation (Section 76-78) */}
          <div className="space-y-2.5">
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("animation", { defaultValue: "Cambio de página" })}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["page", "slide", "none"] as ReaderPageAnimation[]).map((anim) => (
                <button
                  key={anim}
                  onClick={() => onUpdatePreferences({ pageAnimation: anim })}
                  className={`rounded-xl border py-2 px-2 text-xs font-medium transition-all ${
                    preferences.pageAnimation === anim
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {anim === "page" && t("animPage", { defaultValue: "Página" })}
                  {anim === "slide" && t("animSlide", { defaultValue: "Deslizar" })}
                  {anim === "none" && t("animNone", { defaultValue: "Sin efecto" })}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
