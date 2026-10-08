import type {
  Address,
  SignatureBytes,
  Transaction,
  TransactionPartialSigner,
} from "@solana/kit";

import { MSG_MAX, SIG_LEN } from "./apdu";

/** Kit partial signer: SIGN the compiled message bytes on the card. */
export function createCardTransactionSigner(
  address: Address,
  signBytes: (message: Uint8Array) => Promise<Uint8Array>,
): TransactionPartialSigner {
  return {
    address,
    async signTransactions(transactions: readonly Transaction[]) {
      const out: Record<Address, SignatureBytes>[] = [];
      for (const tx of transactions) {
        if (tx.messageBytes.length > MSG_MAX) {
          throw new Error("This transaction is too large for the credential.");
        }
        const sig = await signBytes(Uint8Array.from(tx.messageBytes));
        if (sig.length !== SIG_LEN) throw new Error("The credential returned a bad signature.");
        out.push({ [address]: sig as SignatureBytes });
      }
      return out;
    },
  };
}
