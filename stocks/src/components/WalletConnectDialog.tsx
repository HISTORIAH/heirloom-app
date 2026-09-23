import { useEffect } from "react";
import { useWalletUi, useWalletUiWallet, type UiWallet } from "@wallet-ui/react";
import { useTranslation } from "@heirloom/i18n";
import { useWallet } from "@/contexts/WalletContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WalletConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WalletRow = ({ wallet, onConnected }: { wallet: UiWallet; onConnected: () => void }) => {
  const { connect, isConnecting } = useWalletUiWallet({ wallet });
  const { t } = useTranslation("app");
  return (
    <button
      type="button"
      disabled={isConnecting}
      onClick={async () => {
        try {
          const accounts = await connect();
          if (accounts.length > 0) onConnected();
        } catch (err) {
          console.error("wallet connect failed", err);
        }
      }}
      className="flex w-full items-center gap-3 rounded-lg border border-tile-line px-4 py-3 font-semibold transition-colors hover:bg-tile-soft disabled:opacity-60"
    >
      {wallet.icon && <img src={wallet.icon} alt={wallet.name} className="h-8 w-8 rounded-md" />}
      <span className="flex-1 text-left">{wallet.name}</span>
      {isConnecting && (
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("common.connecting")}
        </span>
      )}
    </button>
  );
};

/** The app's wallet picker, without its analytics. */
const WalletConnectDialog = ({ open, onOpenChange }: WalletConnectDialogProps) => {
  const { isConnected } = useWallet();
  const { t } = useTranslation("app");
  const walletUi = useWalletUi() as unknown as { wallets?: UiWallet[] };
  const wallets = walletUi?.wallets ?? [];

  useEffect(() => {
    if (isConnected && open) onOpenChange(false);
  }, [isConnected, open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl border-tile-line p-6 sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="ed-h3">{t("walletDialog.title")}</DialogTitle>
          <DialogDescription className="text-sm font-medium text-muted-foreground">
            {t("walletDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          {wallets.length === 0 ? (
            <a
              href="https://solana.com/solana-wallets"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-accent-yellow bg-accent-yellow px-4 py-3 text-center text-sm font-semibold"
            >
              {t("walletDialog.noWallets")}
            </a>
          ) : (
            wallets.map((w) => (
              <WalletRow key={w.name} wallet={w} onConnected={() => onOpenChange(false)} />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnectDialog;
