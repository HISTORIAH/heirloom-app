import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown, LayoutDashboard, Gift, LogOut, Copy, Check, RefreshCw } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import WalletConnectDialog from "@/components/WalletConnectDialog";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { SOL_LABEL, USDC_LABEL } from "@/config/constants";

const NavBar = () => {
  const [open, setOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isConnected, publicKey, disconnectWallet } = useWallet();
  const navigate = useNavigate();
  const { sol, usdc, loading: balancesLoading } = useTokenBalances(
    isConnected ? publicKey : null,
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLaunch = () => {
    if (isConnected) {
      navigate("/create-vault");
    } else {
      setWalletDialogOpen(true);
    }
  };

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

  return (
    <>
      <nav className="border-b-8 border-foreground bg-background sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-20">
          <a href="/" className="text-2xl md:text-3xl font-black tracking-tight">
            Heirloom
          </a>

          <div className="hidden md:flex items-center gap-6">
            {isConnected ? (
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
                  Claim Inheritance
                </button>
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 border-[3px] border-foreground rounded-lg px-3 py-2 bg-accent-lime font-bold text-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[2px_2px_0px_0px_hsl(var(--foreground))] hover:shadow-[4px_4px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                  >
                    {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        dropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 border-4 border-foreground rounded-xl bg-background p-3 space-y-2 shadow-[6px_6px_0px_0px_hsl(var(--foreground))] z-50">
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
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold hover:bg-secondary transition-colors text-left"
                      >
                        {copied ? (
                          <><Check className="h-4 w-4" /> Copied</>
                        ) : (
                          <><Copy className="h-4 w-4" /> Copy address</>
                        )}
                      </button>
                      <button
                        onClick={async () => {
                          setDropdownOpen(false);
                          await disconnectWallet();
                          setWalletDialogOpen(true);
                        }}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold hover:bg-secondary transition-colors text-left"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Change wallet
                      </button>
                      <div className="border-t-2 border-foreground" />
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          void disconnectWallet();
                        }}
                        className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="h-4 w-4" />
                        Disconnect wallet
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Button variant="lime" size="sm" onClick={handleLaunch}>
                Launch App
              </Button>
            )}
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
            {isConnected ? (
              <>
                <div className="neo-border rounded-lg p-4 bg-background space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">
                    {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
                  </p>
                  <div className="flex gap-3">
                    <div className="flex-1 neo-border rounded-lg px-3 py-2 bg-accent-yellow/20 text-center">
                      <p className="text-xs font-bold text-muted-foreground">{SOL_LABEL}</p>
                      <p className="text-sm font-black">
                        {balancesLoading ? "..." : sol.toFixed(4)}
                      </p>
                    </div>
                    <div className="flex-1 neo-border rounded-lg px-3 py-2 bg-accent-cyan/20 text-center">
                      <p className="text-xs font-bold text-muted-foreground">{USDC_LABEL}</p>
                      <p className="text-sm font-black">
                        {balancesLoading ? "..." : usdc.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
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
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    void disconnectWallet();
                  }}
                >
                  Disconnect
                </Button>
              </>
            ) : (
              <Button
                variant="default"
                size="lg"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  handleLaunch();
                }}
              >
                Launch App
              </Button>
            )}
          </div>
        </div>
      </nav>

      <WalletConnectDialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen} />
    </>
  );
};

export default NavBar;
