import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useWallet } from "@/contexts/WalletContext";
import { Wallet, Loader2, CheckCircle } from "lucide-react";

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const wallets = [
  {
    id: "phantom",
    name: "Phantom",
    description: "Popular Solana wallet",
    color: "bg-accent-purple",
  },
  {
    id: "solflare",
    name: "Solflare",
    description: "Solana-native wallet",
    color: "bg-accent-orange",
  },
];

const WalletConnectDialog = ({ open, onOpenChange }: WalletConnectDialogProps) => {
  const { wallet } = useWallet();
  const { select, connect } = wallet;
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleConnect = async (walletName: string) => {
    setConnecting(true);
    try {
      select(walletName as never);
      await connect();
      setConnected(true);
      setTimeout(() => {
        onOpenChange(false);
        setConnecting(false);
        setConnected(false);
      }, 1000);
    } catch {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neo-border-thick rounded-2xl neo-shadow-xl p-0 overflow-hidden max-w-md">
        <div className="bg-accent-lime p-6 border-b-4 border-foreground">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black">
              Connect Wallet
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-foreground/70">
              Choose your Solana wallet to get started
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          {connected ? (
            <div className="flex flex-col items-center py-8 gap-4">
              <div className="bg-accent-lime neo-border rounded-full p-4">
                <CheckCircle className="h-10 w-10" strokeWidth={2.5} />
              </div>
              <p className="text-xl font-black">Connected!</p>
            </div>
          ) : (
            wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => handleConnect(w.name)}
                disabled={connecting}
                className={`w-full neo-border rounded-xl p-5 flex items-center gap-4 transition-all duration-150 neo-shadow-md hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[12px_12px_0px_0px_hsl(var(--foreground))] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
                  connecting ? w.color : "bg-card"
                } disabled:opacity-60`}
              >
                <div className={`${w.color} neo-border rounded-xl p-3 shrink-0`}>
                  {connecting ? (
                    <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2.5} />
                  ) : (
                    <Wallet className="h-7 w-7" strokeWidth={2.5} />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-xl font-black">{w.name}</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    {connecting ? "Connecting..." : w.description}
                  </p>
                </div>
              </button>
            ))
          )}

          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center pt-2">
            wallet selection happens in the wallet popup
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnectDialog;
