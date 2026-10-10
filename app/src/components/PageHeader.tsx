import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { LogOut, ChevronDown, Copy, Check } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";
import { useWallet } from "@/contexts/WalletContext";
import { AppNavLinks } from "@/components/app/AppNavLinks";
import { Button } from "@/components/ui/button";
import VaultMark from "@/components/VaultMark";
import { truncateAddress } from "@/lib/utils";

interface PageHeaderProps {
  onDisconnect?: () => void;
  onConnectWallet?: () => void;
}

/** The app bar: the mark home, the two destinations, and the wallet. */
const PageHeader: React.FC<PageHeaderProps> = ({ onDisconnect, onConnectWallet }) => {
  const { t } = useTranslation("app");
  const { isConnected, disconnectWallet, publicKey } = useWallet();
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
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

  const handleDisconnect = () => {
    setWalletDropdownOpen(false);
    if (onDisconnect) {
      onDisconnect();
    } else {
      disconnectWallet();
    }
  };

  const handleCopy = async () => {
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
  };

  const shortAddress = publicKey ? truncateAddress(publicKey, 4) : "";

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
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[var(--page-pad)] py-2.5">
        <Link to="/estates" className="flex min-h-11 items-center gap-3">
          <VaultMark className="h-9 w-9" />
          <span className="text-[28px] font-bold leading-none tracking-[-0.025em]">Heirloom</span>
        </Link>

        <nav aria-label={t("nav.appNav")} className="flex flex-wrap items-center gap-1.5">
          <AppNavLinks />
          {walletControl}
        </nav>
      </div>
    </header>
  );
};

export default PageHeader;
