import { useState, useRef, useEffect } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Wallet, ChevronDown, Copy, Check } from "lucide-react";

interface PageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  onDisconnect?: () => void;
  onConnectWallet?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  backTo = "/",
  backLabel = "Home",
  onDisconnect,
  onConnectWallet,
}) => {
  const { isConnected, disconnectWallet, publicKey } = useWallet();
  const navigate = useNavigate();
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

  return (
    <div className="border-b-4 border-foreground bg-background sticky top-0 z-50">
      <div className="max-w-[1180px] mx-auto px-6 flex items-center justify-between h-20">
        <button
          onClick={() => navigate(backTo)}
          className="flex items-center gap-2 text-lg font-semibold hover:underline group"
        >
          <ArrowLeft
            className="h-5 w-5 transition-transform group-hover:-translate-x-1"
            strokeWidth={2.5}
          />
          {backLabel}
        </button>
        <span className="text-2xl font-bold font-display">{title}</span>
        {isConnected ? (
          <div className="relative" ref={walletDropdownRef}>
            <button
              onClick={() => setWalletDropdownOpen((v) => !v)}
              className="flex items-center gap-2 border-[3px] border-foreground rounded-lg px-3 py-2 bg-accent-yellow font-bold text-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] shadow-[2px_2px_0px_0px_hsl(var(--foreground))] hover:shadow-[4px_4px_0px_0px_hsl(var(--foreground))] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {publicKey?.slice(0, 6)}...{publicKey?.slice(-4)}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  walletDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {walletDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 border-4 border-foreground rounded-xl bg-background p-3 space-y-2 shadow-[6px_6px_0px_0px_hsl(var(--foreground))] z-50">
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
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-secondary transition-colors text-left"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy address
                    </>
                  )}
                </button>
                <div className="border-t-2 border-foreground" />
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" /> Disconnect wallet
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onConnectWallet}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest hover:underline"
          >
            <Wallet className="h-4 w-4" strokeWidth={2.5} />
            <span className="hidden sm:inline">Connect Wallet</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
