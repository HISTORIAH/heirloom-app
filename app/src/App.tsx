import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import {
  WalletUi,
  createWalletUiConfig,
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaMainnet,
} from "@wallet-ui/react";
import walletUiCss from "@wallet-ui/react/index.css?raw";
import { WalletProvider } from "@/contexts/WalletContext";
import { VaultProvider } from "@/contexts/VaultContext";
import { TourProvider } from "@/contexts/TourContext";
import AppTour from "@/components/tour/AppTour";
import Seo from "@/components/Seo";
import { useTranslation } from "@heirloom/i18n";

import CreateVault from "@/pages/CreateVault";
import Dashboard from "@/pages/Dashboard";
import Claim from "@/pages/Claim";
import Defer from "@/pages/Defer";
import Heartbeat from "@/pages/Heartbeat";
import NotFound from "@/pages/NotFound";
import { SOLANA_RPC_ENDPOINT } from "@/config";
import { useAnalytics } from "@/contexts/AnalyticsContext";

const queryClient = new QueryClient();

if (typeof document !== "undefined" && !document.getElementById("wallet-ui-css")) {
  const style = document.createElement("style");
  style.id = "wallet-ui-css";
  style.textContent = walletUiCss;
  document.head.appendChild(style);
}

const isMainnet = SOLANA_RPC_ENDPOINT.includes("mainnet");
const isLocalnet = SOLANA_RPC_ENDPOINT.includes("localhost") || SOLANA_RPC_ENDPOINT.includes("127.0.0.1");

const clusters = isMainnet
  ? [createSolanaMainnet(), createSolanaDevnet(), createSolanaLocalnet()]
  : isLocalnet
    ? [createSolanaLocalnet(), createSolanaDevnet(), createSolanaMainnet()]
    : [createSolanaDevnet(), createSolanaLocalnet(), createSolanaMainnet()];

const walletUiConfig = createWalletUiConfig({ clusters });

/**
 * `/` is not a page here any more — the landing owns it, on the other origin.
 * The redirect carries the query string over because the hand-off travels in
 * it: a bookmark or an old link that still points at the app root with
 * `?tour=1` would otherwise lose the tour on the way to the dashboard.
 */
const RootRedirect = () => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/dashboard", search, hash }} replace />;
};

const RouteAnalytics = () => {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  return null;
};

// Per-route head tags. Every route in here is wallet-gated and per-user, so
// the whole origin is noindex — the indexable marketing page is its own Astro
// build at https://heirlm.xyz and does not pass through this router.

const RouteSeo = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation("app");
  const titles: Record<string, string> = {
    "/create-vault": t("seo.createVaultTitle"),
    "/dashboard": t("seo.dashboardTitle"),
    "/claim": t("seo.claimTitle"),
    "/defer": t("seo.deferTitle"),
    "/heartbeat": t("seo.heartbeatTitle"),
  };
  return <Seo title={titles[pathname] ?? t("seo.notFoundTitle")} path={pathname} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletUi config={walletUiConfig}>
        <WalletProvider>
          <VaultProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <RouteAnalytics />
              <RouteSeo />
              <TourProvider>
                <AppTour />
                <Routes>
                {/* The root of this origin used to be the landing page. It
                    lives on heirlm.xyz now, so app.heirlm.xyz/ opens the
                    dashboard — which already handles the disconnected case
                    with a connect prompt of its own. */}
                <Route path="/" element={<RootRedirect />} />
                <Route path="/create-vault" element={<CreateVault />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/claim" element={<Claim />} />
                <Route path="/defer" element={<Defer />} />
                <Route path="/heartbeat" element={<Heartbeat />} />
                <Route path="*" element={<NotFound />} />
                </Routes>
              </TourProvider>
            </BrowserRouter>
          </VaultProvider>
        </WalletProvider>
      </WalletUi>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
