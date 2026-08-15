import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { I18nProvider } from "@heirloom/i18n";
import "./index.css";
import App from "./App.tsx";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <I18nProvider>
        <AnalyticsProvider>
          <App />
        </AnalyticsProvider>
      </I18nProvider>
    </HelmetProvider>
  </StrictMode>,
);
