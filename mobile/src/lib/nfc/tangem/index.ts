import type { TransactionPartialSigner } from "@solana/kit";

import { isTangemSupported, scanTangemCard, signWithTangemCard } from "@modules/tangem-card";
import { TANGEM_SOLANA_DERIVATION_PATH } from "@/constants/tangem";
import type { TangemCredential } from "@/types/nfc";

import { pickSolanaKey } from "./keys";
import { createTangemTransactionSigner } from "./signer";

export { isTangemCancel, tangemProblemMessage } from "./errors";
export { isTangemSupported };

/** One tap: the card's Solana key, at the same path the Tangem app uses. */
export async function readTangemCredential(): Promise<TangemCredential> {
  const scan = await scanTangemCard(TANGEM_SOLANA_DERIVATION_PATH);
  const credential = pickSolanaKey(scan, TANGEM_SOLANA_DERIVATION_PATH);
  if (credential === undefined) throw new Error("This card has no Solana key.");
  return credential;
}

/** A kit signer that asks this card, by id, to sign. */
export function tangemSignerFor(credential: TangemCredential): TransactionPartialSigner {
  return createTangemTransactionSigner(credential, (card, messages) =>
    signWithTangemCard({
      cardId: card.cardId,
      walletPublicKey: card.walletPublicKey,
      derivationPath: card.derivationPath,
      messages,
    }),
  );
}
