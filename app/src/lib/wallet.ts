import { getWalletAccountFeature, getWalletFeature } from "@wallet-standard/ui-features";
import type { UiWallet, UiWalletAccount } from "@wallet-standard/react";
import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
} from "@solana/wallet-standard-features";
import { SOLANA_CHAIN } from "@/lib/utils";
import type { TxMessageVersion } from "@/types/tx";

type SignAndSendFeature = SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction];
type DisconnectFeature = { disconnect: () => Promise<void> };

/** Wallets the app can use: they're on our chain and can sign and send transactions. */
export function isUsableWallet(wallet: UiWallet): boolean {
  return (
    wallet.chains.includes(SOLANA_CHAIN) && wallet.features.includes(SolanaSignAndSendTransaction)
  );
}

/**
 * The newest transaction format this wallet signs. Wallets list what they can sign on their
 * sign-and-send feature; one that doesn't list v1 (or can't be read) gets v0.
 */
export function transactionVersionFor(account: UiWalletAccount | undefined): TxMessageVersion {
  if (!account) return 0;
  try {
    const feature = getWalletAccountFeature(
      account,
      SolanaSignAndSendTransaction,
    ) as SignAndSendFeature;
    return feature.supportedTransactionVersions.includes(1) ? 1 : 0;
  } catch {
    return 0;
  }
}

/** Asks the wallet to forget this site, for wallets that support it. Most just drop the session. */
export async function disconnectWallet(wallet: UiWallet | undefined): Promise<void> {
  if (!wallet?.features.includes("standard:disconnect")) return;
  const feature = getWalletFeature(wallet, "standard:disconnect") as DisconnectFeature;
  await feature.disconnect();
}
