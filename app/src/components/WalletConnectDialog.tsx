import { useEffect } from "react";
import { useWalletUi, useWalletUiWallet, type UiWallet } from "@wallet-ui/react";
import { useWallet } from "@/contexts/WalletContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAnalytics } from "@/lib/analytics";

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface WalletRowProps {
  wallet: UiWallet;
  onConnected: () => void;
}

const WalletRow = ({ wallet, onConnected }: WalletRowProps) => {
  const { connect, isConnecting } = useWalletUiWallet({ wallet });
  const { track } = useAnalytics();
  return (
    <button
      type="button"
      disabled={isConnecting}
      onClick={async () => {
        track("wallet_connect_attempted", { wallet_provider: wallet.name });
        try {
          const accounts = await connect();
          if (accounts.length > 0) {
            track("wallet_connected", { wallet_provider: wallet.name });
            onConnected();
          }
        } catch (err) {
          track("wallet_connect_failed", { wallet_provider: wallet.name });
          console.error("wallet connect failed", err);
        }
      }}
      className="w-full neo-border rounded-xl px-4 py-3 bg-secondary hover:bg-accent-lime transition-all duration-150 flex items-center gap-3 font-black disabled:opacity-60"
    >
      {wallet.icon && (
        <img src={wallet.icon} alt={wallet.name} className="h-8 w-8 rounded-md" />
      )}
      <span className="flex-1 text-left">{wallet.name}</span>
      {isConnecting && <span className="text-xs font-bold">Connecting…</span>}
    </button>
  );
};

const WalletConnectDialog = ({ open, onOpenChange }: WalletConnectDialogProps) => {
  const { isConnected } = useWallet();
  const walletUi = useWalletUi() as unknown as { wallets?: UiWallet[] };
  const wallets = walletUi?.wallets ?? [];

  useEffect(() => {
    if (isConnected && open) onOpenChange(false);
  }, [isConnected, open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neo-card-static max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">Connect Wallet</DialogTitle>
          <DialogDescription className="font-medium">
            Choose a Solana wallet to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-2">
          {wallets.length === 0 ? (
            <a
              href="https://solana.com/solana-wallets"
              target="_blank"
              rel="noopener noreferrer"
              className="neo-border rounded-xl px-4 py-3 bg-accent-yellow font-black text-center"
            >
              No wallets detected — install one
            </a>
          ) : (
            wallets.map((w) => (
              <WalletRow
                key={w.name}
                wallet={w}
                onConnected={() => onOpenChange(false)}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnectDialog;
