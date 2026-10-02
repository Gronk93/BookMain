import React, { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { AppShell } from "@/shared/components/AppShell";
import { LibraryPage } from "@/features/library/pages/LibraryPage";
import { ReaderPage } from "@/features/reader/pages/ReaderPage";
import { SettingsPage } from "@/features/settings/pages/SettingsPage";
import { NotesPage } from "@/features/notes/pages/NotesPage";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { StudyHomePage, BookStudyPage } from "@/features/study";
import NotFound from "@/pages/not-found";
import { ROUTES } from "./routes";

export function AppRouter() {
  const [, setLocation] = useLocation();
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem("bookmind-dark") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("bookmind-dark", String(dark));
    } catch {}
  }, [dark]);

  return (
    <AppShell onToggleTheme={() => setDark(!dark)} isDark={dark}>
      <Switch>
        <Route path={ROUTES.HOME} component={LibraryPage} />
        <Route path={ROUTES.READ}>
          {() => (
            <ProtectedRoute>
              <ReaderPage />
            </ProtectedRoute>
          )}
        </Route>
        <Route path={ROUTES.NOTES}>
          {() => (
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          )}
        </Route>
        <Route path={ROUTES.STUDY}>
          {() => (
            <ProtectedRoute>
              <StudyHomePage />
            </ProtectedRoute>
          )}
        </Route>
        <Route path={ROUTES.STUDY_BOOK}>
          {() => (
            <ProtectedRoute>
              <BookStudyPage />
            </ProtectedRoute>
          )}
        </Route>
        <Route path={ROUTES.SETTINGS} component={SettingsPage} />
        <Route path={ROUTES.LOGIN}>
          {() => (
            <div className="mx-auto max-w-md px-4 py-12">
              <LoginForm
                onSuccess={() => setLocation("/")}
                onSwitchToRegister={() => setLocation("/register")}
              />
            </div>
          )}
        </Route>
        <Route path={ROUTES.REGISTER}>
          {() => (
            <div className="mx-auto max-w-md px-4 py-12">
              <RegisterForm
                onSuccess={() => setLocation("/")}
                onSwitchToLogin={() => setLocation("/login")}
              />
            </div>
          )}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}
