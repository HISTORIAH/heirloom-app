import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Wallet, ChevronDown, Copy, Check } from "lucide-react";
import { useTranslation } from "@heirloom/i18n";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  onDisconnect?: () => void;
  onConnectWallet?: () => void;
  /** Hide the disconnected connect control (empty dashboard already has a CTA). */
  hideConnect?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  backTo = "/",
  backLabel,
  onDisconnect,
  onConnectWallet,
  hideConnect = false,
}) => {
  const { t } = useTranslation("app");
  const { isConnected, disconnectWallet, publicKey } = useWallet();
  const navigate = useNavigate();
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
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

  return (
    <div className="sticky top-0 z-50 border-b border-tile-line bg-background">
      <div className="flex h-[var(--nav-h)] items-center gap-3 px-[var(--page-pad)] md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4">
        <button
          type="button"
          onClick={() => navigate(backTo)}
          aria-label={homeLabel}
          className={`group ${chromeBtn} md:flex md:h-auto md:w-auto md:items-center md:gap-2 md:justify-self-start md:px-0 md:hover:bg-transparent`}
        >
          <ArrowLeft
            className="h-4 w-4 transition-transform group-hover:-translate-x-1 md:group-hover:-translate-x-1"
            strokeWidth={2.25}
          />
          <span className="hidden text-sm font-semibold md:inline md:hover:underline">{homeLabel}</span>
        </button>

        <span className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-tight md:flex-none md:justify-self-center md:text-center md:text-[clamp(1.35rem,1.75vw,2.15rem)] md:tracking-[-0.022em]">
          {title}
        </span>

        {isConnected ? (
          <div className="relative shrink-0 md:justify-self-end" ref={walletDropdownRef}>
            <button
              type="button"
              onClick={() => setWalletDropdownOpen((v) => !v)}
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
        ) : hideConnect ? (
          <div aria-hidden="true" className="hidden md:block md:justify-self-end" />
        ) : (
          <button
            type="button"
            onClick={onConnectWallet}
            aria-label={t("common.connectWallet")}
            className={`${chromeBtn} md:flex md:h-auto md:w-auto md:items-center md:gap-2 md:justify-self-end md:px-0 md:hover:bg-transparent`}
          >
            <Wallet className="h-4 w-4" strokeWidth={2.25} />
            <span className="hidden text-[11px] font-bold uppercase tracking-[0.18em] md:inline md:text-xs md:hover:underline">
              {t("common.connectWallet")}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
