import { useEffect } from "react";
import { ChevronRight } from "lucide-react";
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
  /**
   * The visitor closed the dialog without connecting (Escape, the overlay,
   * the close button) — as opposed to it closing because a wallet connected.
   */
  onDismiss?: () => void;
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
      className="group flex w-full items-center gap-3.5 rounded-2xl border border-tile-line px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-100 ease-out hover:border-foreground/30 hover:bg-tile-soft/60 disabled:cursor-wait disabled:bg-tile-soft"
    >
      {wallet.icon && (
        <img src={wallet.icon} alt="" className="h-9 w-9 rounded-xl border border-tile-line" />
      )}
      <span className="flex-1 text-left">{wallet.name}</span>
      {isConnecting ? (
        <span className="hs-mono-xs text-muted-foreground">{t("common.connecting")}</span>
      ) : (
        <ChevronRight
          aria-hidden="true"
          className="h-4 w-4 text-muted-foreground transition-transform duration-100 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      )}
    </button>
  );
};

/** The app's wallet picker, without its analytics. */
const WalletConnectDialog = ({ open, onOpenChange, onDismiss }: WalletConnectDialogProps) => {
  const { isConnected } = useWallet();
  const { t } = useTranslation("app");
  const walletUi = useWalletUi() as unknown as { wallets?: UiWallet[] };
  const wallets = walletUi?.wallets ?? [];

  useEffect(() => {
    if (isConnected && open) onOpenChange(false);
  }, [isConnected, open, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Radix only reports closes the visitor made; a successful connect
        // closes the dialog through onOpenChange directly, below.
        if (!next) onDismiss?.();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("walletDialog.title")}</DialogTitle>
          <DialogDescription className="text-[0.9375rem] leading-relaxed text-muted-foreground">
            {t("walletDialog.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex flex-col gap-2">
          {wallets.length === 0 ? (
            <a
              href="https://solana.com/solana-wallets"
              target="_blank"
              rel="noopener noreferrer"
              className="hs-btn hs-btn-primary w-full"
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
