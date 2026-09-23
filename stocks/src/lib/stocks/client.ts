import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase58Decoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type GetLatestBlockhashApi,
  type GetSignatureStatusesApi,
  type Instruction,
  type Rpc,
  type TransactionSigner,
} from "@solana/kit";

/** The RPC methods sending and confirming a transaction need, on any cluster. */
export type StocksClient = {
  rpc: Rpc<GetLatestBlockhashApi & GetSignatureStatusesApi>;
};

const base58 = getBase58Decoder();

/**
 * Build, sign, and send a transaction with the given instructions.
 * Returns a base58-encoded transaction signature.
 */
export async function sendTx(
  client: StocksClient,
  feePayer: TransactionSigner,
  ix: Instruction | Instruction[],
): Promise<string> {
  const instructions = Array.isArray(ix) ? ix : [ix];
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
  );

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message);
  return base58.decode(signatureBytes);
}
