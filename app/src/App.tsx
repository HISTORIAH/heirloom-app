import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { WalletProvider } from "@/contexts/WalletContext";
import { VaultProvider } from "@/contexts/VaultContext";
import { TourProvider } from "@/contexts/TourContext";
import AppTour from "@/components/tour/AppTour";
import { AppFooter } from "@/components/app/AppFooter";
import Seo from "@/components/Seo";
import { useTranslation } from "@heirloom/i18n";

import CreateVault from "@/pages/CreateVault";
import Dashboard from "@/pages/Dashboard";
import Claim from "@/pages/Claim";
import Defer from "@/pages/Defer";
import Heartbeat from "@/pages/Heartbeat";
import VerifyEmail from "@/pages/VerifyEmail";
import NotFound from "@/pages/NotFound";
import { useAnalytics } from "@/contexts/AnalyticsContext";

const queryClient = new QueryClient();

/**
 * Sends an old path to its current one. The query string comes along because
 * hand-offs travel in it: a bookmark or an old link with `?tour=1` would
 * otherwise lose the tour on the way.
 */
const RedirectTo = ({ pathname }: { pathname: string }) => {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname, search, hash }} replace />;
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
    "/estates": t("seo.dashboardTitle"),
    "/inherit": t("seo.claimTitle"),
    "/defer": t("seo.deferTitle"),
    "/check-in": t("seo.heartbeatTitle"),
  };
  return <Seo title={titles[pathname] ?? t("seo.notFoundTitle")} path={pathname} />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <WalletProvider>
        <VaultProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteAnalytics />
            <RouteSeo />
            <TourProvider>
              <AppTour />
              {/* Every page fills the space above the footer, so short pages
                  still put it at the bottom of the window. */}
              <div className="flex min-h-screen flex-col">
                <Routes>
                  {/* The root of this origin used to be the landing page. It
                    lives on heirlm.xyz now, so app.heirlm.xyz/ opens the
                    dashboard — which already handles the disconnected case
                    with a connect prompt of its own. */}
                  <Route path="/" element={<RedirectTo pathname="/estates" />} />
                  <Route path="/create-vault" element={<CreateVault />} />
                  <Route path="/estates" element={<Dashboard />} />
                  <Route path="/inherit" element={<Claim />} />
                  {/* The old names, still in emails, bookmarks and older landing builds. */}
                  <Route path="/dashboard" element={<RedirectTo pathname="/estates" />} />
                  <Route path="/claim" element={<RedirectTo pathname="/inherit" />} />
                  <Route path="/heartbeat" element={<RedirectTo pathname="/check-in" />} />
                  <Route path="/defer" element={<Defer />} />
                  <Route path="/check-in" element={<Heartbeat />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <AppFooter />
              </div>
            </TourProvider>
          </BrowserRouter>
        </VaultProvider>
      </WalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
