import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";

import { MSG_MAX } from "@/lib/nfc/apdu";
import { waitForConfirmed } from "@/lib/solana/confirm";
import type { EstateRpc } from "@/types/program";

type Lifetime = Awaited<ReturnType<ReturnType<EstateRpc["getLatestBlockhash"]>["send"]>>["value"];

function messageLen(signer: TransactionSigner, ixs: Instruction[], lifetime: Lifetime): number {
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => appendTransactionMessageInstructions(ixs, tx),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
  );
  return compileTransaction(message).messageBytes.length;
}

/** Pack instructions so each compiled message fits the applet SIGN buffer. */
export function packInstructionsForCard(
  measure: (ixs: Instruction[]) => number,
  ixs: Instruction[],
): Instruction[][] {
  const batches: Instruction[][] = [];
  let current: Instruction[] = [];
  for (const ix of ixs) {
    const trial = [...current, ix];
    if (measure(trial) > MSG_MAX) {
      if (current.length === 0) throw new Error("This transaction is too large for the credential.");
      batches.push(current);
      current = [ix];
      if (measure(current) > MSG_MAX) {
        throw new Error("This transaction is too large for the credential.");
      }
    } else {
      current = trial;
    }
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

export async function sendCardIxs(
  rpc: EstateRpc,
  signer: TransactionSigner,
  ixs: Instruction[],
): Promise<string> {
  if (ixs.length === 0) throw new Error("Nothing to send");
  const { value: lifetime } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => appendTransactionMessageInstructions(ixs, tx),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
  );
  if (compileTransaction(message).messageBytes.length > MSG_MAX) {
    throw new Error("This transaction is too large for the credential.");
  }
  const signed = await signTransactionMessageWithSigners(message);
  const wire = getBase64EncodedWireTransaction(signed);
  await rpc.sendTransaction(wire, { encoding: "base64" }).send();
  const signature = getSignatureFromTransaction(signed);
  await waitForConfirmed(rpc, signature);
  return signature;
}

export async function sendCardBatches(
  rpc: EstateRpc,
  signer: TransactionSigner,
  ixs: Instruction[],
): Promise<string[]> {
  if (ixs.length === 0) return [];
  const { value: lifetime } = await rpc.getLatestBlockhash().send();
  const batches = packInstructionsForCard((batch) => messageLen(signer, batch, lifetime), ixs);
  const sigs: string[] = [];
  for (const batch of batches) {
    sigs.push(await sendCardIxs(rpc, signer, batch));
  }
  return sigs;
}
