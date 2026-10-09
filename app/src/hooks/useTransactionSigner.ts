import { useWalletAccountTransactionSendingSigner } from "@solana/react";
import { useWalletUi, type UiWalletAccount } from "@wallet-ui/react";

/**
 * The connected wallet's transaction signer, built with the app's own @solana/react (kit 8),
 * whose encoder knows v1 transactions. wallet-ui's `useWalletUiSigner` bundles @solana/react
 * 6.1, which encodes every transaction in the v0 layout and breaks v1 ("uint8 overrun").
 */
export function useTransactionSigner(account: UiWalletAccount) {
  const { cluster } = useWalletUi();
  return useWalletAccountTransactionSendingSigner(account, cluster.id);
}
