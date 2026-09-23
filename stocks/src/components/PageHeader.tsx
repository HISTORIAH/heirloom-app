import { useState, useRef, useEffect } from "react";
import { ArrowLeft, LogOut, Wallet, ChevronDown, Copy, Check, Menu, X } from "lucide-react";
import { LanguageSwitcher, useTranslation } from "@heirloom/i18n";
import { useWallet } from "@/contexts/WalletContext";
import { StocksNavLinks } from "@/components/app/StocksNavLinks";
import { landingUrl } from "@/config";

interface PageHeaderProps {
  onConnectWallet?: () => void;
}

/**
 * The app's header with the stocks destinations in it. Six links need about
 * 1100px beside the wallet control — at 1024px the bar pushes it off-screen —
 * so the bar collapses into the drawer below `xl` rather than the app's `md`.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ onConnectWallet }) => {
  const { t, i18n } = useTranslation("app");
  const { isConnected, disconnectWallet, publicKey } = useWallet();
  // Home is the marketing site, on the other origin, in this language.
  const home = landingUrl(i18n.resolvedLanguage ?? i18n.language);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!walletDropdownOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (!walletDropdownRef.current?.contains(e.target as Node)) {
        setWalletDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [walletDropdownOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const chromeBtn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-tile-soft";

  const walletControl = isConnected ? (
    <div className="relative md:ml-3" ref={walletDropdownRef}>
      <button
        type="button"
        onClick={() => {
          setNavOpen(false);
          setWalletDropdownOpen((v) => !v);
        }}
        aria-label={publicKey ?? t("common.connectWallet")}
        className={`${chromeBtn} md:flex md:h-auto md:w-auto md:items-center md:gap-2 md:rounded-lg md:border md:border-tile-line md:bg-tile-soft md:px-3 md:py-2 md:hover:bg-secondary`}
      >
        <Wallet className="h-4 w-4 md:hidden" strokeWidth={2.25} />
        <span className="hidden font-mono text-xs font-semibold md:inline">
          {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
        </span>
        <ChevronDown
          className={`hidden h-3.5 w-3.5 transition-transform duration-200 md:block ${
            walletDropdownOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {walletDropdownOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 space-y-1 rounded-xl border border-tile-line bg-background p-2 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.25)]">
          {publicKey && (
            <p className="truncate px-3 py-1.5 font-mono text-[11px] text-muted-foreground md:hidden">
              {publicKey}
            </p>
          )}
          <button
            onClick={async () => {
              if (!publicKey) return;
              try {
                await navigator.clipboard.writeText(publicKey);
                setCopied(true);
                setTimeout(() => {
                  setCopied(false);
                  setWalletDropdownOpen(false);
                }, 1200);
              } catch {
                setCopied(false);
              }
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-tile-soft"
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
            onClick={() => {
              setWalletDropdownOpen(false);
              disconnectWallet();
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-accent-red transition-colors hover:bg-accent-red/10"
          >
            <LogOut className="h-4 w-4" /> {t("common.disconnectWallet")}
          </button>
        </div>
      )}
    </div>
  ) : (
    <button
      type="button"
      onClick={onConnectWallet}
      aria-label={t("common.connectWallet")}
      className={`${chromeBtn} md:ml-3 md:flex md:h-auto md:w-auto md:items-center md:gap-2 md:px-0 md:hover:bg-transparent`}
    >
      <Wallet className="h-4 w-4" strokeWidth={2.25} />
      <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] md:inline md:text-xs md:hover:underline">
        {t("common.connectWallet")}
      </span>
    </button>
  );

  return (
    <div className="sticky top-0 z-50 border-b border-tile-line bg-background">
      <div className="flex h-[var(--nav-h)] items-center justify-between px-[var(--page-pad)]">
        <a
          href={home}
          aria-label={t("common.home")}
          className={`group ${chromeBtn} md:flex md:h-auto md:w-auto md:items-center md:gap-2 md:px-0 md:hover:bg-transparent`}
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform group-hover:-translate-x-1"
            strokeWidth={2.25}
          />
          <span className="hidden text-sm font-semibold md:inline md:hover:underline">
            {t("common.home")}
          </span>
        </a>

        <div className="flex items-center">
          <nav className="hidden items-center gap-1 xl:flex">
            <StocksNavLinks />
          </nav>
          <LanguageSwitcher
            className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-tile-soft hover:text-foreground"
            menuClassName="absolute right-0 top-full z-50 mt-2 w-44 space-y-1 rounded-xl border border-tile-line bg-background p-2 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.25)]"
            itemClassName="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-tile-soft hover:text-foreground"
            activeItemClassName="!text-foreground bg-tile-soft"
            globeClassName="h-4 w-4"
            chevronClassName="h-3.5 w-3.5 opacity-60"
          />
          {walletControl}
          <button
            type="button"
            className={`${chromeBtn} xl:hidden`}
            aria-expanded={navOpen}
            aria-label={navOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => {
              setWalletDropdownOpen(false);
              setNavOpen((v) => !v);
            }}
          >
            {navOpen ? (
              <X className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {navOpen && (
        <div className="border-t border-tile-line bg-background xl:hidden">
          <div className="space-y-1 px-[var(--page-pad)] py-3">
            <StocksNavLinks variant="drawer" onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PageHeader;
