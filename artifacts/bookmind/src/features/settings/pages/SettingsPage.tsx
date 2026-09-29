import React from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Globe, Palette, BookOpen, User, LogOut, Check } from "lucide-react";

export function SettingsPage() {
  const { t, i18n } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { user, preferences, updatePreferences, logout } = useAuth();

  const currentLang = i18n.language === "en-US" ? "en-US" : "es-MX";

  const handleLanguageChange = async (lang: "es-MX" | "en-US") => {
    i18n.changeLanguage(lang);
    await updatePreferences({ language: lang });
  };

  const handleThemeChange = async (theme: "light" | "dark" | "system") => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    }
    await updatePreferences({ theme });
  };

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <div className="mb-8 border-b border-border/70 pb-6">
        <h1 className="serif text-4xl font-medium tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Configura tus preferencias de lectura e idioma.
        </p>
      </div>

      <div className="space-y-8">
        {/* Language Selection */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Globe size={18} />
            </span>
            <div>
              <h2 className="text-base font-medium">{t("languageLabel")}</h2>
              <p className="text-xs text-muted-foreground">{t("languageDescription")}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleLanguageChange("es-MX")}
              className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                currentLang === "es-MX"
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border hover:bg-secondary/50 text-foreground"
              }`}
            >
              <div>
                <p className="text-sm">Español</p>
                <p className="text-[11px] text-muted-foreground">México (es-MX)</p>
              </div>
              {currentLang === "es-MX" && <Check size={18} />}
            </button>

            <button
              onClick={() => handleLanguageChange("en-US")}
              className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                currentLang === "en-US"
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border hover:bg-secondary/50 text-foreground"
              }`}
            >
              <div>
                <p className="text-sm">English</p>
                <p className="text-[11px] text-muted-foreground">United States (en-US)</p>
              </div>
              {currentLang === "en-US" && <Check size={18} />}
            </button>
          </div>
        </section>

        {/* Visual Theme Selection */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <Palette size={18} />
            </span>
            <div>
              <h2 className="text-base font-medium">{t("themeLabel")}</h2>
              <p className="text-xs text-muted-foreground">{t("themeDescription")}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {(["light", "dark", "system"] as const).map((thm) => (
              <button
                key={thm}
                onClick={() => handleThemeChange(thm)}
                className={`rounded-2xl border p-3.5 text-center text-xs font-medium transition ${
                  preferences?.theme === thm
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-secondary/50 text-foreground"
                }`}
              >
                {tc(`theme.${thm}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Account Details */}
        {user && (
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <User size={18} />
              </span>
              <div>
                <h2 className="text-base font-medium">{t("accountLabel")}</h2>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="mt-5 border-t border-border/60 pt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {user.displayName || "Lector"}
              </span>

              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/10"
              >
                <LogOut size={14} />
                <span>{tc("nav.logout")}</span>
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
