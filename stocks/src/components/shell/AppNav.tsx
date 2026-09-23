import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, LogOut, Menu, Wallet, X } from "lucide-react";
import { LanguageSwitcher, useTranslation } from "@heirloom/i18n";
import { useWallet } from "@/contexts/WalletContext";
import { StocksNavLinks } from "@/components/app/StocksNavLinks";
import { Button } from "@/components/ui/button";
import { truncateAddress } from "@/lib/format";
import { Brand } from "./Brand";

/** Closes a popover on an outside click or Escape. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

/**
 * A small disc for the connected wallet: a sweep between the two brand
 * accents, turned by the address so each wallet keeps its own.
 */
const WalletDisc: React.FC<{ address: string }> = ({ address }) => {
  let hash = 0;
  for (let i = 0; i < address.length; i++) hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className="h-5 w-5 shrink-0 rounded-full border border-foreground/10"
      style={{
        background: `conic-gradient(from ${hash % 360}deg, hsl(var(--accent-sage)), hsl(var(--accent-yellow)), hsl(var(--accent-sage)))`,
      }}
    />
  );
};

const WalletControl: React.FC<{ onConnect?: () => void; onOpen: () => void }> = ({
  onConnect,
  onOpen,
}) => {
  const { t } = useTranslation("app");
  const { isConnected, disconnectWallet, publicKey } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), root);

  if (!isConnected || !publicKey) {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={onConnect}
        aria-label={t("common.connectWallet")}
        className="max-sm:w-9 max-sm:px-0"
      >
        <Wallet aria-hidden="true" className="sm:hidden" />
        <span className="hidden sm:inline">{t("common.connectWallet")}</span>
      </Button>
    );
  }

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={publicKey}
        onClick={() => {
          onOpen();
          setOpen((v) => !v);
        }}
        className="hs-btn hs-btn-ghost hs-btn-sm gap-2 max-sm:w-9 max-sm:px-0"
      >
        <WalletDisc address={publicKey} />
        <span className="hs-mono hidden sm:inline">{truncateAddress(publicKey, 4)}</span>
        <ChevronDown
          aria-hidden="true"
          className={`hidden transition-transform duration-150 ease-out motion-reduce:transition-none sm:block ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div role="menu" className="hs-menu hs-rise absolute right-0 top-full z-50 mt-2 w-72">
          <div className="mb-1 rounded-[0.625rem] bg-tile-soft px-3 py-2.5">
            <p className="hs-mono-xs break-all text-muted-foreground">{publicKey}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="hs-menu-item"
            onClick={async () => {
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
            }}
          >
            {copied ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? t("common.copied") : t("common.copyAddress")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="hs-menu-item text-[hsl(var(--hs-danger))]"
            onClick={() => {
              setOpen(false);
              disconnectWallet();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t("common.disconnectWallet")}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * The app's bar, cut from the landing's: the name on the left, the six
 * destinations as quiet links, and the wallet on the right. The six links need
 * about 500px beside the name, the language menu and the wallet, which a 1024px
 * window can't spare, so below `xl` they fold into a drawer rather than
 * crowding the bar.
 */
export const AppNav: React.FC<{ onConnectWallet?: () => void }> = ({ onConnectWallet }) => {
  const { t } = useTranslation("app");
  const [drawer, setDrawer] = useState(false);
  const root = useRef<HTMLElement>(null);
  useDismiss(drawer, () => setDrawer(false), root);

  return (
    <header ref={root} className="hs-nav">
      <div className="flex h-full items-center justify-between gap-4 px-[var(--page-pad)]">
        <div className="flex min-w-0 items-center gap-6">
          <Brand />
          <nav className="hidden items-center gap-0.5 xl:flex">
            <StocksNavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <LanguageSwitcher
            className="hidden h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors duration-100 ease-out hover:bg-tile-soft hover:text-foreground sm:flex"
            menuClassName="hs-menu absolute right-0 top-full z-50 mt-2 w-44"
            itemClassName="hs-menu-item text-muted-foreground hover:text-foreground"
            activeItemClassName="!text-foreground bg-tile-soft"
            globeClassName="h-4 w-4"
            chevronClassName="h-3.5 w-3.5 opacity-60"
          />
          <WalletControl onConnect={onConnectWallet} onOpen={() => setDrawer(false)} />
          <button
            type="button"
            className="hs-btn hs-btn-quiet hs-btn-icon xl:hidden"
            aria-expanded={drawer}
            aria-label={drawer ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setDrawer((v) => !v)}
          >
            {drawer ? (
              <X className="!h-5 !w-5" aria-hidden="true" />
            ) : (
              <Menu className="!h-5 !w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {drawer && (
        <div className="absolute inset-x-0 top-full border-b border-tile-line bg-background xl:hidden">
          <nav className="hs-rise flex flex-col gap-1 px-[var(--page-pad)] py-3">
            <StocksNavLinks variant="drawer" onNavigate={() => setDrawer(false)} />
            {/* The bar has no room for the language menu on a phone. */}
            <div className="mt-1 border-t border-tile-line pt-2 sm:hidden">
              <LanguageSwitcher
                className="hs-nav-link h-12 w-full gap-2 px-4 text-base"
                menuClassName="hs-menu mt-2 w-full"
                itemClassName="hs-menu-item text-muted-foreground hover:text-foreground"
                activeItemClassName="!text-foreground bg-tile-soft"
                globeClassName="h-4 w-4"
                chevronClassName="ml-auto h-3.5 w-3.5 opacity-60"
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
