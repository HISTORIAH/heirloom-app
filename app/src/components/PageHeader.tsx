import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, Wallet, ChevronDown, Copy, Check, Menu, X } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { AppNavLinks } from "@/components/app/AppNavLinks";
import { LANDING_URL } from "@/config";

interface PageHeaderProps {
  /** Where the back control goes. An absolute URL leaves the app entirely. */
  backTo?: string;
  backLabel?: string;
  onDisconnect?: () => void;
  onConnectWallet?: () => void;
  /** Hide the disconnected connect control (empty dashboard already has a CTA). */
  hideConnect?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  // Home is the marketing site, which is no longer part of this bundle.
  backTo = LANDING_URL,
  backLabel,
  onDisconnect,
  onConnectWallet,
  hideConnect = false,
}) => {
  const { t } = useTranslation("app");
  const { isConnected, disconnectWallet, publicKey } = useWallet();
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  const homeLabel = backLabel ?? t("common.home");

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

  const handleDisconnect = () => {
    setWalletDropdownOpen(false);
    if (onDisconnect) {
      onDisconnect();
    } else {
      disconnectWallet();
    }
  };

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
            onClick={handleDisconnect}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-accent-red transition-colors hover:bg-accent-red/10"
          >
            <LogOut className="h-4 w-4" /> {t("common.disconnectWallet")}
          </button>
        </div>
      )}
    </div>
  ) : hideConnect ? null : (
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
        <BackControl to={backTo} label={homeLabel} className={`group ${chromeBtn} md:flex md:h-auto md:w-auto md:items-center md:gap-2 md:px-0 md:hover:bg-transparent`} />

        <div className="flex items-center">
          <nav className="hidden items-center gap-1 md:flex">
            <AppNavLinks />
          </nav>
          {walletControl}
          <button
            type="button"
            className={`${chromeBtn} md:hidden`}
            aria-expanded={navOpen}
            aria-label={navOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => {
              setWalletDropdownOpen(false);
              setNavOpen((v) => !v);
            }}
          >
            {navOpen ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
          </button>
        </div>
      </div>

      {navOpen && (
        <div className="border-t border-tile-line bg-background md:hidden">
          <div className="space-y-1 px-[var(--page-pad)] py-3">
            <AppNavLinks variant="drawer" onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * The back control. It is a plain anchor when it points off-origin — which is
 * the default now that home is heirlm.xyz — and a router link when a caller
 * hands it an in-app path.
 */
const BackControl: React.FC<{ to: string; label: string; className: string }> = ({
  to,
  label,
  className,
}) => {
  const inner = (
    <>
      <ArrowLeft
        className="h-4 w-4 transition-transform group-hover:-translate-x-1"
        strokeWidth={2.25}
      />
      <span className="hidden text-sm font-semibold md:inline md:hover:underline">{label}</span>
    </>
  );

  return /^https?:\/\//.test(to) ? (
    <a href={to} aria-label={label} className={className}>
      {inner}
    </a>
  ) : (
    <Link to={to} aria-label={label} className={className}>
      {inner}
    </Link>
  );
};

export default PageHeader;
