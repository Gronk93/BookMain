import React, { useEffect, useRef, useState, useCallback } from "react";
import { type ReaderTheme } from "../hooks/useReaderPreferences";

interface ReaderShellProps {
  theme: ReaderTheme;
  children: React.ReactNode;
  showControls: boolean;
  onShowControlsChange: (show: boolean) => void;
  isOverlayOpen?: boolean;
  className?: string;
}

export function ReaderShell({
  theme,
  children,
  showControls,
  onShowControlsChange,
  isOverlayOpen = false,
  className = "",
}: ReaderShellProps) {
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Exact theme color palettes according to PRD BM-05
  const themeStyles: Record<ReaderTheme, { bg: string; text: string; cssClass: string }> = {
    paper: {
      bg: "#FBF7EE",
      text: "#2B2927",
      cssClass: "theme-paper",
    },
    sepia: {
      bg: "#F4ECD8",
      text: "#433422",
      cssClass: "theme-sepia",
    },
    night: {
      bg: "#16171A",
      text: "#E6E4DF",
      cssClass: "theme-night dark",
    },
  };

  const activeTheme = themeStyles[theme] || themeStyles.paper;

  const resetIdleTimer = useCallback(() => {
    onShowControlsChange(true);

    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // Only auto-hide if no modal / overlay is currently open
    if (!isOverlayOpen) {
      idleTimerRef.current = setTimeout(() => {
        onShowControlsChange(false);
      }, 3500);
    }
  }, [onShowControlsChange, isOverlayOpen]);

  useEffect(() => {
    // If overlay opened, cancel idle timer and keep controls visible
    if (isOverlayOpen) {
      onShowControlsChange(true);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      return;
    }

    resetIdleTimer();

    const handleActivity = () => {
      resetIdleTimer();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("touchstart", handleActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [resetIdleTimer, isOverlayOpen, onShowControlsChange]);

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-300 relative flex flex-col ${activeTheme.cssClass} ${className}`}
      style={{
        backgroundColor: activeTheme.bg,
        color: activeTheme.text,
      }}
      onClick={(e) => {
        // Clicking directly on background toggles controls
        if ((e.target as HTMLElement).getAttribute("data-page-background") === "true") {
          onShowControlsChange(!showControls);
        }
      }}
    >
      {children}
    </div>
  );
}
