import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WalletUi,
  createWalletUiConfig,
  createSolanaDevnet,
  createSolanaLocalnet,
  createSolanaMainnet,
} from "@wallet-ui/react";
import walletUiCss from "@wallet-ui/react/index.css?raw";
import { useTranslation } from "@heirloom/i18n";
import { WalletProvider } from "@/contexts/WalletContext";
import Seo from "@/components/Seo";
import { Toaster } from "@/components/ui/toaster";
import { SOLANA_RPC_ENDPOINT } from "@/config";

import Landing from "@/pages/Landing";
import Portfolio from "@/pages/Portfolio";
import Browse from "@/pages/Browse";
import Protect from "@/pages/Protect";
import Dashboard from "@/pages/Dashboard";
import Recover from "@/pages/Recover";
import Inherit from "@/pages/Inherit";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

if (typeof document !== "undefined" && !document.getElementById("wallet-ui-css")) {
  const style = document.createElement("style");
  style.id = "wallet-ui-css";
  style.textContent = walletUiCss;
  document.head.appendChild(style);
}

const isMainnet = SOLANA_RPC_ENDPOINT.includes("mainnet");
const isLocalnet =
  SOLANA_RPC_ENDPOINT.includes("localhost") || SOLANA_RPC_ENDPOINT.includes("127.0.0.1");

const clusters = isMainnet
  ? [createSolanaMainnet(), createSolanaDevnet(), createSolanaLocalnet()]
  : isLocalnet
    ? [createSolanaLocalnet(), createSolanaDevnet(), createSolanaMainnet()]
    : [createSolanaDevnet(), createSolanaLocalnet(), createSolanaMainnet()];

const walletUiConfig = createWalletUiConfig({ clusters });

// Per-route head tags. Only the landing is indexable; see components/Seo.tsx.
const RouteSeo = () => {
  const { pathname } = useLocation();
  const { t } = useTranslation("stocks");
  if (pathname === "/") {
    return (
      <Seo
        title={t("seo.landingTitle")}
        description={t("seo.landingDescription")}
        path="/"
        indexable
      />
    );
  }
  const titles: Record<string, string> = {
    "/portfolio": t("seo.portfolioTitle"),
    "/browse": t("seo.browseTitle"),
    "/protect": t("seo.protectTitle"),
    "/dashboard": t("seo.dashboardTitle"),
    "/recover": t("seo.recoverTitle"),
    "/inherit": t("seo.inheritTitle"),
  };
  return (
    <Seo
      title={titles[pathname] ?? t("seo.notFoundTitle")}
      description={t("seo.defaultDescription")}
      path={pathname}
    />
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WalletUi config={walletUiConfig}>
      <WalletProvider>
        <Toaster />
        <BrowserRouter>
          <RouteSeo />
          <Routes>
            {/* The root is this origin's own marketing page; the app starts
                at the portfolio. */}
            <Route path="/" element={<Landing />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/protect" element={<Protect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/recover" element={<Recover />} />
            <Route path="/inherit" element={<Inherit />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </WalletUi>
  </QueryClientProvider>
);

export default App;
