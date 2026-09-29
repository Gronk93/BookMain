import React from "react";
import { Router as WouterRouter } from "wouter";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppProviders } from "./providers";
import { AppRouter } from "./router";
import "@/i18n";

export function App() {
  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

  return (
    <AppProviders>
      <WouterRouter base={basePath}>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </WouterRouter>
    </AppProviders>
  );
}

export default App;
