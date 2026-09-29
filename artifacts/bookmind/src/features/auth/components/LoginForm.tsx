import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import { BookOpen, Sparkles, AlertCircle } from "lucide-react";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login("demo@bookmind.app", "bookmind123");
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-soft)] sm:p-10">
      <div className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
          <BookOpen size={24} />
        </span>
        <h2 className="serif mt-5 text-3xl tracking-tight">{t("loginTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">{t("email")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">{t("password")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("passwordPlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("loggingIn") : t("loginButton")}
        </button>
      </form>

      <div className="relative my-6 text-center text-xs text-muted-foreground">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <span className="relative bg-card px-2">o acceso rápido</span>
      </div>

      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/80 bg-secondary/50 py-2.5 text-xs font-medium text-foreground transition hover:bg-secondary"
      >
        <Sparkles size={14} className="text-primary" />
        Demo One-Click (demo@bookmind.app)
      </button>

      {onSwitchToRegister && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("noAccount")}{" "}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="font-medium text-primary underline underline-offset-4 hover:opacity-80"
          >
            {t("registerButton")}
          </button>
        </p>
      )}
    </div>
  );
}
