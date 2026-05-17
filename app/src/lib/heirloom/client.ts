import {
  appendTransactionMessageInstruction,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import type { AppRpc, AppRpcSubscriptions } from "@/contexts/WalletContext";

export type HeirloomClient = {
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
};

const base58 = getBase58Decoder();

/**
 * Build, sign, and send a transaction with the given instructions.
 * Returns a base58-encoded transaction signature.
 */
export async function sendTx(
  client: HeirloomClient,
  feePayer: TransactionSigner,
  ix: Instruction | Instruction[],
): Promise<string> {
  const ixs = Array.isArray(ix) ? ix : [ix];
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let message: any = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
  );
  for (const instruction of ixs) {
    message = appendTransactionMessageInstruction(instruction, message);
  }

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message);
  return base58.decode(signatureBytes);
}
