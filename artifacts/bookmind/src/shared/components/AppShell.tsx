import React, { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { BookOpen, Menu, Moon, Sun, Settings2, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface AppShellProps {
  children: ReactNode;
  onToggleTheme: () => void;
  isDark: boolean;
}

export function AppShell({ children, onToggleTheme, isDark }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();
  const { t: tc } = useTranslation("common");
  const { user, isAuthenticated, logout } = useAuth();

  const inReader = location.startsWith("/read/");

  if (inReader) {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  return (
    <div className="grain min-h-screen bg-background text-foreground flex flex-col">
      <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            className="rounded-full p-2 text-muted-foreground hover:bg-secondary md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
          >
            <Menu size={19} />
          </button>

          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-90">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpen size={17} />
            </span>
            <span className="font-semibold tracking-[-0.03em] text-base sm:text-lg">
              {tc("appName")}
            </span>
          </Link>
        </div>

        <nav
          className={`${
            menuOpen ? "flex" : "hidden"
          } absolute left-5 right-5 top-16 z-20 flex-col gap-1 rounded-2xl border bg-card p-3 shadow-xl md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <Link
            href="/"
            className={`rounded-full px-4 py-2 text-sm transition ${
              location === "/"
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
            onClick={() => setMenuOpen(false)}
          >
            {tc("nav.library")}
          </Link>

          <Link
            href="/notes"
            className={`rounded-full px-4 py-2 text-sm transition ${
              location === "/notes"
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
            onClick={() => setMenuOpen(false)}
          >
            {tc("nav.notes", { defaultValue: "Notas" })}
          </Link>

          <Link
            href="/study"
            className={`rounded-full px-4 py-2 text-sm transition ${
              location === "/study" || location.startsWith("/study/")
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
            onClick={() => setMenuOpen(false)}
          >
            {tc("nav.study", { defaultValue: "Estudio" })}
          </Link>

          <Link
            href="/settings"
            className={`rounded-full px-4 py-2 text-sm transition ${
              location === "/settings"
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            }`}
            onClick={() => setMenuOpen(false)}
          >
            {tc("nav.settings")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/settings"
                className="hidden sm:flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition"
              >
                <UserIcon size={13} className="text-primary" />
                <span className="max-w-[100px] truncate">{user?.displayName || "Lector"}</span>
              </Link>
              <button
                onClick={() => logout()}
                className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                aria-label={tc("nav.logout")}
                title={tc("nav.logout")}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
            >
              {tc("nav.login")}
            </Link>
          )}

          <button
            className="rounded-full p-2.5 text-muted-foreground hover:bg-secondary transition"
            onClick={onToggleTheme}
            aria-label={tc("theme.toggle")}
            title={tc("theme.toggle")}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
