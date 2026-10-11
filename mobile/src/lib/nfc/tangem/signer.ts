import {
  getAddressEncoder,
  getBase16Decoder,
  getBase16Encoder,
  type Address,
  type SignatureBytes,
  type Transaction,
  type TransactionPartialSigner,
} from "@solana/kit";

import { TANGEM_MAX_MESSAGE_BYTES } from "@/constants/tangem";
import { verifyEd25519 } from "@/lib/nfc/ed25519";
import type { TangemCredential } from "@/types/nfc";

/** Signs hex messages on the card in one tap. The native module in the app; a fake in tests. */
export type TangemSignMessages = (credential: TangemCredential, messagesHex: string[]) => Promise<string[]>;

const toHex = getBase16Decoder();
const fromHex = getBase16Encoder();
const addressBytes = getAddressEncoder();

function assertFitsCard(message: Uint8Array): void {
  if (message.length > TANGEM_MAX_MESSAGE_BYTES) {
    throw new Error("This transaction is too large for the card.");
  }
}

/** The card must have signed with the key we registered, or the transaction would fail later. */
function assertSignedBy(address: Address, message: Uint8Array, signature: Uint8Array): void {
  if (!verifyEd25519(Uint8Array.from(addressBytes.encode(address)), message, signature)) {
    throw new Error("The card signed with a different key. Is this the right card?");
  }
}

/** Kit partial signer for a Tangem card. Every transaction in one call goes in a single tap. */
export function createTangemTransactionSigner(
  credential: TangemCredential,
  signMessages: TangemSignMessages,
): TransactionPartialSigner {
  return {
    address: credential.address,
    async signTransactions(transactions: readonly Transaction[]) {
      const messages = transactions.map((tx) => Uint8Array.from(tx.messageBytes));
      messages.forEach(assertFitsCard);
      const signaturesHex = await signMessages(credential, messages.map((message) => toHex.decode(message)));
      if (signaturesHex.length !== messages.length) throw new Error("The card skipped a signature.");
      return messages.map((message, index) => {
        const signature = Uint8Array.from(fromHex.encode(signaturesHex[index]));
        assertSignedBy(credential.address, message, signature);
        return { [credential.address]: signature as SignatureBytes };
      });
    },
  };
}
