import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown, LayoutDashboard, Gift, Heart, LogOut, Copy, Check, RefreshCw } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import Logo from "@/components/Logo";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { SOL_LABEL, USDC_LABEL } from "@/lib/constants";

const NavBar = () => {
  const { t } = useTranslation("app");
  const [open, setOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isConnected, publicKey, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  // The landing page is built from hairline tiles; the app screens still use
  // the heavier bordered language. The nav is shared, so it follows the route
  // rather than forcing one look on both.
  const isLanding = useLocation().pathname === "/";
  const { sol, usdc, loading: balancesLoading } = useTokenBalances(
    isConnected ? publicKey : null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 bg-background ${
          isLanding ? "border-b border-tile-line" : "border-b-4 border-foreground"
        }`}
      >
        <div
          className={
            // The landing runs edge to edge, so the nav does too — its logo and
            // controls sit on the same gutter the page ruling is drawn on.
            isLanding
              ? "flex h-[var(--nav-h)] items-center justify-between px-[var(--page-pad)]"
              : "mx-auto flex h-20 max-w-7xl items-center justify-between px-6"
          }
        >
          <a href="/" className="flex items-center">
            <Logo className="h-8 md:h-10" />
          </a>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:bg-secondary rounded-lg px-4 py-2 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5" />
              {t("nav.dashboard")}
            </button>
            <button
              onClick={() => navigate("/claim")}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:bg-secondary rounded-lg px-4 py-2 transition-colors"
            >
              <Gift className="h-5 w-5" />
              {t("nav.claimInheritance")}
            </button>
            <button
              onClick={() => navigate("/heartbeat")}
              className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide hover:bg-secondary rounded-lg px-4 py-2 transition-colors"
            >
              <Heart className="h-5 w-5" />
              {t("nav.heartbeat")}
            </button>
            {isConnected ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 border-[3px] border-foreground rounded-lg px-3 py-2 bg-accent-yellow font-bold text-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[2px_2px_0px_0px_hsl(var(--foreground))] hover:shadow-[4px_4px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 border-4 border-foreground rounded-xl bg-background p-3 space-y-2 shadow-[6px_6px_0px_0px_hsl(var(--foreground))] z-50">
                      <button
                        onClick={async () => {
                          if (!publicKey) return;
                          try {
                            await navigator.clipboard.writeText(publicKey);
                            setCopied(true);
                            setTimeout(() => {
                              setCopied(false);
                              setDropdownOpen(false);
                            }, 1200);
                          } catch {
                            setCopied(false);
                          }
                        }}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-secondary transition-colors text-left"
                      >
                        {copied ? (
                          <><Check className="h-4 w-4" /> {t("nav.copied")}</>
                        ) : (
                          <><Copy className="h-4 w-4" /> {t("nav.copyAddress")}</>
                        )}
                      </button>
                      <button
                        onClick={async () => {
                          setDropdownOpen(false);
                          await disconnectWallet();
                          setWalletDialogOpen(true);
                        }}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-secondary transition-colors text-left"
                      >
                        <RefreshCw className="h-4 w-4" />
                        {t("nav.changeWallet")}
                      </button>
                      <div className="border-t-2 border-foreground" />
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          void disconnectWallet();
                        }}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("nav.disconnectWallet")}
                      </button>
                    </div>
                  )}
                </div>
            ) : (
              <Button
                variant={isLanding ? "flat-yellow" : "yellow"}
                size="sm"
                className="!shadow-none hover:!shadow-none hover:!translate-x-0 hover:!translate-y-0 active:!translate-x-0 active:!translate-y-0 hover:brightness-95"
                onClick={() => setWalletDialogOpen(true)}
              >
                {t("nav.connectWallet")}
              </Button>
            )}
          </div>

          <button
            className="md:hidden neo-border rounded-lg p-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px]"
            onClick={() => setOpen(!open)}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={`md:hidden border-t-4 border-foreground bg-accent-yellow overflow-hidden transition-all duration-300 ease-out ${
            open ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0 border-t-0"
          }`}
        >
          <div className="p-6 space-y-4">
            {isConnected && (
              <div className="neo-border rounded-lg p-4 bg-background space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
                  {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                </p>
                <div className="flex gap-3">
                  <div className="flex-1 neo-border rounded-lg px-3 py-2 bg-accent-yellow/20 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{SOL_LABEL}</p>
                    <p className="text-sm font-bold">
                      {balancesLoading ? "..." : sol.toFixed(4)}
                    </p>
                  </div>
                  <div className="flex-1 neo-border rounded-lg px-3 py-2 bg-accent-cyan/20 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{USDC_LABEL}</p>
                    <p className="text-sm font-bold">
                      {balancesLoading ? "..." : usdc.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate("/dashboard");
              }}
            >
              {t("nav.dashboard")}
            </Button>
            <Button
              variant="orange"
              size="lg"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate("/claim");
              }}
            >
              {t("nav.claimInheritance")}
            </Button>
            <Button
              variant="default"
              size="lg"
              className="w-full"
              onClick={() => {
                setOpen(false);
                navigate("/heartbeat");
              }}
            >
              {t("nav.heartbeat")}
            </Button>
            {isConnected ? (
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  void disconnectWallet();
                }}
              >
                {t("nav.disconnect")}
              </Button>
            ) : (
              <Button
                variant="yellow"
                size="lg"
                className="w-full !shadow-none hover:!shadow-none hover:!translate-x-0 hover:!translate-y-0 active:!translate-x-0 active:!translate-y-0 hover:brightness-95"
                onClick={() => {
                  setOpen(false);
                  setWalletDialogOpen(true);
                }}
              >
                {t("nav.connectWallet")}
              </Button>
            )}
          </div>
        </div>
      </nav>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default NavBar;
