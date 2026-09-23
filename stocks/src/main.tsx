import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import { I18nProvider } from "@heirloom/i18n";
import { registerStocksMessages } from "@heirloom/i18n/stocks";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// The stocks namespace is not part of the shared resources, so it has to be on
// the instance before anything renders a key from it.
registerStocksMessages();

async function start() {
  // A local-key wallet for driving the app against a local validator. Both
  // conditions are needed, and `import.meta.env.DEV` is false in a production
  // build, so the module is never bundled there.
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_BURNER_WALLET === "true") {
    const { registerBurnerWallet } = await import("./dev/burnerWallet");
    await registerBurnerWallet();
  }

  // The boundary is outermost so a throw anywhere below it — wallet adapter,
  // RPC provider, a route — still leaves something on screen.
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <HelmetProvider>
          <I18nProvider>
            <App />
          </I18nProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

void start();
