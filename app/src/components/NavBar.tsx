import { useState } from "react";
import { Menu, X, LayoutDashboard, Gift, Heart } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "@heirloom/i18n";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import WalletMenu from "@/components/app/WalletMenu";
import Logo from "@/components/Logo";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { SOL_LABEL, USDC_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * One nav for the whole product. It used to fork on route — hairlines on the
 * landing, a heavy bordered bar everywhere else — which is exactly the seam
 * this redesign removes. The marketing page and the app are one document, so
 * they share one masthead sitting on the same gutters as the page ruling.
 */
const NavBar = () => {
  const { t } = useTranslation("app");
  const [open, setOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const { isConnected, publicKey, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { sol, usdc, loading: balancesLoading } = useTokenBalances(
    isConnected ? publicKey : null,
  );

  const links = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { to: "/claim", label: t("nav.claimInheritance"), icon: Gift },
    { to: "/heartbeat", label: t("nav.heartbeat"), icon: Heart },
  ];

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-tile-line bg-background">
        <div className="flex h-[var(--nav-h)] items-center justify-between gap-6 px-[var(--page-pad)]">
          <a href="/" className="flex shrink-0 items-center" aria-label="Heirloom">
            <Logo className="h-7 md:h-8" />
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {links.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors lg:text-xs",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-tile-soft hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              );
            })}
            <span aria-hidden="true" className="mx-2 h-5 w-px bg-tile-line" />
            <WalletMenu
              onConnect={() => setWalletDialogOpen(true)}
              onChangeWallet={async () => {
                await disconnectWallet();
                setWalletDialogOpen(true);
              }}
            />
          </div>

          <button
            className="rounded-lg border border-tile-line p-2 transition-colors hover:border-foreground md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" strokeWidth={2} /> : <Menu className="h-5 w-5" strokeWidth={2} />}
          </button>
        </div>

        {/* The mobile menu is the same page, folded: hairline rows, no fill
            except on the one promoted action. */}
        <div
          className={cn(
            "overflow-hidden border-tile-line bg-background transition-[max-height,opacity] duration-300 ease-out md:hidden",
            open ? "max-h-[640px] border-t opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="space-y-1 px-[var(--page-pad)] py-4">
            {isConnected && publicKey ? (
              <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-tile-line px-4 py-3">
                <span className="font-mono text-xs font-semibold">
                  {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
                </span>
                <span className="flex items-center gap-4 text-xs font-semibold tabular-nums">
                  <span>
                    <span className="cap mr-1.5">{SOL_LABEL}</span>
                    {balancesLoading ? "…" : sol.toFixed(3)}
                  </span>
                  <span>
                    <span className="cap mr-1.5">{USDC_LABEL}</span>
                    {balancesLoading ? "…" : usdc.toFixed(2)}
                  </span>
                </span>
              </div>
            ) : null}

            {links.map(({ to, label, icon: Icon }) => (
              <button
                key={to}
                onClick={() => go(to)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-bold uppercase tracking-[0.12em] transition-colors",
                  pathname === to ? "bg-foreground text-background" : "hover:bg-tile-soft",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {label}
              </button>
            ))}

            <div className="pt-2">
              {isConnected ? (
                <button
                  onClick={() => {
                    setOpen(false);
                    void disconnectWallet();
                  }}
                  className="w-full rounded-lg border border-tile-line px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-accent-red transition-colors hover:bg-tile-soft"
                >
                  {t("nav.disconnect")}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setOpen(false);
                    setWalletDialogOpen(true);
                  }}
                  className="w-full rounded-lg border border-accent-yellow bg-accent-yellow px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] transition-colors hover:brightness-95"
                >
                  {t("nav.connectWallet")}
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default NavBar;
