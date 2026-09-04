import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { I18nProvider } from "@heirloom/i18n";
import "./index.css";
import App from "./App.tsx";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// The boundary is outermost so a throw anywhere below it — wallet adapter,
// RPC provider, a route — still leaves something on screen. It reads its copy
// through getI18n() rather than a hook, so it works even if the provider under
// it is what failed.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <I18nProvider>
          <AnalyticsProvider>
            <App />
          </AnalyticsProvider>
        </I18nProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
