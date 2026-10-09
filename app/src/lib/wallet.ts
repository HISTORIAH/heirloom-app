import { getWalletAccountFeature } from "@wallet-standard/ui-features";
import type { UiWalletAccount } from "@wallet-standard/ui";
import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
} from "@solana/wallet-standard-features";
import type { TxMessageVersion } from "@/types/tx";

type SignAndSendFeature = SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction];

/**
 * The newest transaction format this wallet signs. Wallets list what they can sign on their
 * sign-and-send feature; one that doesn't list v1 (or can't be read) gets v0.
 */
export function transactionVersionFor(account: UiWalletAccount | null): TxMessageVersion {
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
