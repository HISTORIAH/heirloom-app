import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, ChevronDown, Copy, Check, Menu, X } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { useWallet } from "@/contexts/WalletContext";
import { AppNavLinks } from "@/components/app/AppNavLinks";
import { Button } from "@/components/ui/button";
import VaultMark from "@/components/VaultMark";
import { truncateAddress } from "@/lib/utils";

type PageHeaderProps = {
  onDisconnect?: () => void;
  onConnectWallet?: () => void;
};

/**
 * The app bar: the mark home, the two destinations, and the wallet. From md up it is one
 * row. Below md the links and the wallet would wrap into three rows, so they move into a
 * drawer behind a menu button, the same pattern as the landing's nav.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ onDisconnect, onConnectWallet }) => {
  const { t } = useTranslation("app");
  const { isConnected, disconnectWallet, publicKey } = useWallet();
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!walletDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!walletDropdownRef.current?.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWalletDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [walletDropdownOpen]);

  // The drawer covers the page, so the page behind it should not scroll.
  useEffect(() => {
    if (!drawerOpen) return;
    const restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = restoreOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const closeMenus = () => {
    setWalletDropdownOpen(false);
    setDrawerOpen(false);
  };

  const handleDisconnect = () => {
    closeMenus();
    if (onDisconnect) {
      onDisconnect();
    } else {
      disconnectWallet();
    }
  };

  const handleConnect = () => {
    setDrawerOpen(false);
    onConnectWallet?.();
  };

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        closeMenus();
      }, 1200);
    } catch {
      setCopied(false);
    }
  };

  const shortAddress = publicKey ? truncateAddress(publicKey, 4) : "";

  // Shared by the desktop dropdown and the drawer.
  const walletActions = (
    <>
      <button
        type="button"
        role="menuitem"
        onClick={handleCopy}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition-colors hover:bg-tile-soft"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" /> {t("common.copied")}
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" /> {t("common.copyAddress")}
          </>
        )}
      </button>
      <div className="border-t border-tile-line" />
      <button
        type="button"
        role="menuitem"
        onClick={handleDisconnect}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-accent-red transition-colors hover:bg-accent-red/10"
      >
        <LogOut className="h-4 w-4" /> {t("common.disconnectWallet")}
      </button>
    </>
  );

  const walletControl = isConnected ? (
    <div className="relative ml-2" ref={walletDropdownRef}>
      <button
        type="button"
        onClick={() => setWalletDropdownOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={walletDropdownOpen}
        aria-label={t("nav.walletMenu", { address: shortAddress })}
        className="flex min-h-11 items-center gap-2.5 rounded-lg border border-tile-line bg-background px-5 font-mono text-[13px] font-bold transition-colors hover:bg-tile-soft"
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-lime" />
        {shortAddress}
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            walletDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {walletDropdownOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 space-y-1 rounded-xl border border-tile-line bg-background p-2 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.25)]"
        >
          {walletActions}
        </div>
      )}
    </div>
  ) : (
    <Button
      variant="flat"
      size="sm"
      onClick={onConnectWallet}
      className="ml-2 h-11 px-6 tracking-[0.12em]"
    >
      {t("common.connectWallet")}
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-t-4 border-b-tile-line border-t-brand-teal bg-background">
      <div className="flex items-center justify-between gap-x-4 px-[var(--page-pad)] py-2.5">
        <Link to="/estates" onClick={closeMenus} className="flex min-h-11 items-center gap-3">
          <VaultMark className="h-9 w-9" />
          <span className="text-[28px] font-bold leading-none tracking-[-0.025em]">Heirloom</span>
        </Link>

        <nav aria-label={t("nav.appNav")} className="hidden items-center gap-1.5 md:flex">
          <AppNavLinks />
          {walletControl}
        </nav>

        <button
          type="button"
          onClick={() => setDrawerOpen((open) => !open)}
          aria-expanded={drawerOpen}
          aria-controls="app-nav-drawer"
          aria-label={drawerOpen ? t("nav.closeMenu") : t("nav.openMenu")}
          className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-tile-line transition-colors hover:bg-tile-soft md:hidden"
        >
          {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          {/* A connected wallet stays visible while the drawer is shut. */}
          {isConnected && !drawerOpen && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-lime"
            />
          )}
        </button>
      </div>

      {drawerOpen && (
        <div id="app-nav-drawer" className="border-t border-tile-line bg-background md:hidden">
          <nav aria-label={t("nav.appNav")} className="space-y-1 px-[var(--page-pad)] py-4">
            <AppNavLinks layout="drawer" onNavigate={closeMenus} />
          </nav>

          <div className="border-t border-tile-line px-[var(--page-pad)] py-4">
            {isConnected ? (
              <div role="menu" className="space-y-1">
                <div className="flex min-h-11 items-center gap-2.5 px-3 font-mono text-[13px] font-bold">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent-lime" />
                  {shortAddress}
                </div>
                {walletActions}
              </div>
            ) : (
              <Button
                variant="flat"
                size="lg"
                onClick={handleConnect}
                className="w-full tracking-[0.12em]"
              >
                {t("common.connectWallet")}
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PageHeader;
