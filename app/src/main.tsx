import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";
import App from "./App.tsx";
import { AnalyticsProvider } from "@/contexts/AnalyticsContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelmetProvider>
      <AnalyticsProvider>
        <App />
      </AnalyticsProvider>
    </HelmetProvider>
  </StrictMode>,
);
