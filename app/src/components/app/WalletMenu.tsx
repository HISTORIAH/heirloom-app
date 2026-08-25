import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, LogOut, RefreshCw, Wallet } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useTranslation } from "@heirloom/i18n";
import { cn } from "@/lib/utils";

/**
 * The connected wallet, wherever it appears: a hairline chip carrying the
 * truncated address, and one menu behind it. The nav, the page heads and the
 * portals used to each carry their own copy of this, in three different
 * visual languages.
 */
const WalletMenu = ({
  onDisconnect,
  onConnect,
  onChangeWallet,
  className,
}: {
  onDisconnect?: () => void | Promise<void>;
  onConnect?: () => void;
  /** Offered only where reconnecting makes sense (the nav). */
  onChangeWallet?: () => void | Promise<void>;
  className?: string;
}) => {
  const { t } = useTranslation("app");
  const { isConnected, publicKey, disconnectWallet } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isConnected || !publicKey) {
    return (
      <button
        type="button"
        onClick={onConnect}
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-lg border border-accent-yellow bg-accent-yellow px-3.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors hover:brightness-95",
          className,
        )}
      >
        <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="hidden sm:inline">{t("common.connectWallet")}</span>
      </button>
    );
  }

  const short = `${publicKey.slice(0, 4)}…${publicKey.slice(-4)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      setCopied(false);
    }
  };

  const handleDisconnect = async () => {
    setOpen(false);
    if (onDisconnect) {
      await onDisconnect();
      return;
    }
    await disconnectWallet();
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-tile-line bg-background px-3 font-mono text-xs font-semibold transition-colors hover:border-foreground"
      >
        {short}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="sheet absolute right-0 top-full z-50 mt-2 w-60 p-1.5"
        >
          <button
            role="menuitem"
            onClick={handleCopy}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-tile-soft"
          >
            {copied ? (
              <><Check className="h-4 w-4" /> {t("common.copied")}</>
            ) : (
              <><Copy className="h-4 w-4" /> {t("common.copyAddress")}</>
            )}
          </button>
          {onChangeWallet ? (
            <button
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await onChangeWallet();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-tile-soft"
            >
              <RefreshCw className="h-4 w-4" /> {t("nav.changeWallet")}
            </button>
          ) : null}
          <div className="my-1.5 h-px bg-tile-line" />
          <button
            role="menuitem"
            onClick={handleDisconnect}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-accent-red transition-colors hover:bg-tile-soft"
          >
            <LogOut className="h-4 w-4" /> {t("common.disconnectWallet")}
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletMenu;
