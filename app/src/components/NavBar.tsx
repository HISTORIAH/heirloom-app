import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown, LogOut, Copy, Check, RefreshCw } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useTranslation } from "@heirloom/i18n";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import Logo from "@/components/Logo";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { SOL_LABEL, USDC_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { AppNavLinks } from "@/components/app/AppNavLinks";

const NavBar = () => {
  const { t } = useTranslation("app");
  const [open, setOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isConnected, publicKey, disconnectWallet } = useWallet();
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-tile-line bg-background">
        <div className="flex h-[var(--nav-h)] items-center justify-between px-[var(--page-pad)]">
          <a href="/" className="flex items-center">
            <Logo className="h-8 md:h-10" />
          </a>

          <div className="hidden items-center gap-1 md:flex">
            <AppNavLinks />
            {isConnected ? (
              <div className="relative ml-3" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-tile-line bg-tile-soft px-3 py-2 font-mono text-xs font-semibold transition-colors hover:bg-secondary"
                >
                  {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      dropdownOpen && "rotate-180",
                    )}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 space-y-1 rounded-xl border border-tile-line bg-background p-2 shadow-[0_8px_24px_-12px_hsl(var(--foreground)/0.25)]">
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
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-tile-soft"
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
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors hover:bg-tile-soft"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {t("nav.changeWallet")}
                    </button>
                    <div className="border-t border-tile-line" />
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        void disconnectWallet();
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold text-accent-red transition-colors hover:bg-accent-red/10"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("nav.disconnectWallet")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="flat-yellow"
                size="sm"
                className="ml-3"
                onClick={() => setWalletDialogOpen(true)}
              >
                {t("nav.connectWallet")}
              </Button>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg border border-tile-line p-2 transition-colors hover:bg-tile-soft md:hidden"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
          >
            {open ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-tile-line bg-background md:hidden">
            <div className="space-y-1 px-[var(--page-pad)] py-4">
              {isConnected && (
                <div className="mb-3 rounded-lg border border-tile-line px-4 py-3">
                  <p className="text-center font-mono text-xs font-semibold">
                    {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 divide-x divide-tile-line border-t border-tile-line pt-3">
                    <div className="pr-3 text-center">
                      <p className="ed-label">{SOL_LABEL}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {balancesLoading ? "…" : sol.toFixed(4)}
                      </p>
                    </div>
                    <div className="pl-3 text-center">
                      <p className="ed-label">{USDC_LABEL}</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {balancesLoading ? "…" : usdc.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <AppNavLinks variant="drawer" onNavigate={() => setOpen(false)} />
              {isConnected ? (
                <DrawerLink
                  onClick={() => {
                    setOpen(false);
                    void disconnectWallet();
                  }}
                  className="text-accent-red"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2} />
                  {t("nav.disconnect")}
                </DrawerLink>
              ) : (
                <Button
                  variant="flat-yellow"
                  size="lg"
                  className="mt-3 w-full"
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
        )}
      </nav>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

const DrawerLink: React.FC<{
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, className, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold transition-colors hover:bg-tile-soft",
      className,
    )}
  >
    {children}
  </button>
);

export default NavBar;
