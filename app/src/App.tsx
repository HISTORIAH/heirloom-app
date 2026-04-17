import { BrowserRouter, Routes, Route } from "react-router-dom";
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

import Index from "@/pages/Index";
import CreateVault from "@/pages/CreateVault";
import Dashboard from "@/pages/Dashboard";
import Claim from "@/pages/Claim";
import Defer from "@/pages/Defer";
import NotFound from "@/pages/NotFound";
import { NETWORK } from "@/config/constants";

const queryClient = new QueryClient();

if (typeof document !== "undefined" && !document.getElementById("wallet-ui-css")) {
  const style = document.createElement("style");
  style.id = "wallet-ui-css";
  style.textContent = walletUiCss;
  document.head.appendChild(style);
}

const clusters =
  NETWORK === "mainnet-beta"
    ? [createSolanaMainnet(), createSolanaDevnet(), createSolanaLocalnet()]
    : NETWORK === "localnet"
      ? [createSolanaLocalnet(), createSolanaDevnet(), createSolanaMainnet()]
      : [createSolanaDevnet(), createSolanaLocalnet(), createSolanaMainnet()];

const walletUiConfig = createWalletUiConfig({ clusters });

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletUi config={walletUiConfig}>
        <WalletProvider>
          <VaultProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/create-vault" element={<CreateVault />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/claim" element={<Claim />} />
                <Route path="/defer" element={<Defer />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </VaultProvider>
        </WalletProvider>
      </WalletUi>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
