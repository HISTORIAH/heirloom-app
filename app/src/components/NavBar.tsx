import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X, LayoutDashboard, Gift } from "lucide-react";
import { WalletUiDropdown } from "@wallet-ui/react";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { SOL_LABEL, USDC_LABEL } from "@/config/constants";

const NavBar = () => {
  const [open, setOpen] = useState(false);
  const { isConnected, publicKey } = useWallet();
  const navigate = useNavigate();
  const { sol, usdc, loading: balancesLoading } = useTokenBalances(
    isConnected ? publicKey : null,
  );

  return (
    <nav className="border-b-8 border-foreground bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
        <a href="/" className="text-2xl md:text-3xl font-black tracking-tight">
          Heirloom
        </a>

        <div className="hidden md:flex items-center gap-4">
          {isConnected && (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-sm font-black uppercase tracking-wide hover:bg-secondary rounded-lg px-4 py-2 transition-colors"
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </button>
              <button
                onClick={() => navigate("/claim")}
                className="flex items-center gap-2 text-sm font-black uppercase tracking-wide hover:bg-secondary rounded-lg px-4 py-2 transition-colors"
              >
                <Gift className="h-5 w-5" />
                Claim
              </button>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="neo-border rounded-lg px-2 py-1 bg-accent-yellow/20">
                  {SOL_LABEL} {balancesLoading ? "..." : sol.toFixed(4)}
                </span>
                <span className="neo-border rounded-lg px-2 py-1 bg-accent-cyan/20">
                  {USDC_LABEL} {balancesLoading ? "..." : usdc.toFixed(2)}
                </span>
              </div>
            </>
          )}
          <WalletUiDropdown />
        </div>

        <button
          className="md:hidden neo-border rounded-lg p-2 transition-all duration-150 active:translate-x-[2px] active:translate-y-[2px]"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        className={`md:hidden border-t-4 border-foreground bg-accent-lime overflow-hidden transition-all duration-300 ease-out ${
          open ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0 border-t-0"
        }`}
      >
        <div className="p-6 space-y-4">
          <WalletUiDropdown />
          {isConnected && (
            <>
              <Button
                variant="default"
                size="lg"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  navigate("/dashboard");
                }}
              >
                Dashboard
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
                Claim Inheritance
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
