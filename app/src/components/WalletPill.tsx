import { useEffect, useRef, useState } from "react";
import { Check, Copy, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/contexts/WalletContext";

interface WalletPillProps {
  onDisconnect?: () => void | Promise<void>;
}

const WalletPill: React.FC<WalletPillProps> = ({ onDisconnect }) => {
  const { publicKey, disconnectWallet } = useWallet();
  const navigate = useNavigate();
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

  if (!publicKey) {
    return (
      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Not connected
      </div>
    );
  }

  const short = `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;

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
    navigate("/");
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        {short}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-60 border-4 border-foreground rounded-xl bg-background p-3 space-y-2 shadow-[6px_6px_0px_0px_hsl(var(--foreground))] z-50"
        >
          <button
            role="menuitem"
            onClick={handleCopy}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold hover:bg-secondary transition-colors text-left"
          >
            {copied ? (
              <><Check className="h-4 w-4" /> Copied</>
            ) : (
              <><Copy className="h-4 w-4" /> Copy address</>
            )}
          </button>
          <div className="border-t-2 border-foreground" />
          <button
            role="menuitem"
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="h-4 w-4" /> Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletPill;
