import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
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

import Index from "@/pages/Index";
import CreateVault from "@/pages/CreateVault";
import Dashboard from "@/pages/Dashboard";
import Claim from "@/pages/Claim";
import Defer from "@/pages/Defer";
import Heartbeat from "@/pages/Heartbeat";
import NotFound from "@/pages/NotFound";
import { SOLANA_RPC_ENDPOINT } from "@/config";
import Blog from "./pages/blog";
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

const RouteAnalytics = () => {
  const location = useLocation();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname, trackPageView]);

  return null;
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
              <TourProvider>
                <AppTour />
                <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/create-vault" element={<CreateVault />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/claim" element={<Claim />} />
                <Route path="/defer" element={<Defer />} />
                <Route path="/heartbeat" element={<Heartbeat />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<Blog />} />
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
