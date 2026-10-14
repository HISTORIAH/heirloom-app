import {
  appendTransactionMessageInstructions,
  assertIsTransactionWithinSizeLimit,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  isTransactionPartialSigner,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Instruction,
  type Transaction,
  type TransactionPartialSigner,
  type TransactionSigner,
} from "@solana/kit";

import { SubmittedTxError } from "@/lib/failure";
import { waitForConfirmed } from "@/lib/solana/confirm";
import type { EstateRpc } from "@/types/program";

/** What a partial signer takes: a compiled transaction with its lifetime and size checked. */
type SignableTransaction = Parameters<TransactionPartialSigner["signTransactions"]>[0][number];

type Lifetime = Awaited<ReturnType<ReturnType<EstateRpc["getLatestBlockhash"]>["send"]>>["value"];

function buildMessage(signer: TransactionSigner, ixs: Instruction[], lifetime: Lifetime) {
  return pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => appendTransactionMessageInstructions(ixs, tx),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(lifetime, tx),
  );
}

function compileForCard(signer: TransactionSigner, ixs: Instruction[], lifetime: Lifetime): SignableTransaction {
  const transaction = compileTransaction(buildMessage(signer, ixs, lifetime));
  assertIsTransactionWithinSizeLimit(transaction);
  return transaction;
}

function messageLen(signer: TransactionSigner, ixs: Instruction[], lifetime: Lifetime): number {
  return compileTransaction(buildMessage(signer, ixs, lifetime)).messageBytes.length;
}

/** Pack instructions so each compiled message fits what the card signs (`maxBytes`). */
export function packInstructionsForCard(
  measure: (ixs: Instruction[]) => number,
  ixs: Instruction[],
  maxBytes: number,
): Instruction[][] {
  const batches: Instruction[][] = [];
  let current: Instruction[] = [];
  for (const ix of ixs) {
    const trial = [...current, ix];
    if (measure(trial) > maxBytes) {
      if (current.length === 0) throw new Error("This transaction is too large for the credential.");
      batches.push(current);
      current = [ix];
      if (measure(current) > maxBytes) {
        throw new Error("This transaction is too large for the credential.");
      }
    } else {
      current = trial;
    }
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/**
 * Signs every transaction in one call to the card's signer: one hold on an Heirloom card, one tap
 * on a Tangem card. Other signers sign one transaction at a time.
 */
async function signAll(
  signer: TransactionSigner,
  transactions: SignableTransaction[],
): Promise<Transaction[]> {
  if (!isTransactionPartialSigner(signer)) {
    throw new Error("A credential signer must sign without sending.");
  }
  const signatures = await signer.signTransactions(transactions);
  return transactions.map((tx, index) => ({
    ...tx,
    signatures: { ...tx.signatures, ...signatures[index] },
  }));
}

async function sendSigned(rpc: EstateRpc, signed: Transaction): Promise<string> {
  await rpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: "base64" }).send();
  const signature = getSignatureFromTransaction(signed);
  try {
    await waitForConfirmed(rpc, signature);
  } catch (cause) {
    throw new SubmittedTxError(signature, cause);
  }
  return signature;
}

/**
 * Sends `ixs` from the card, split into transactions that fit `maxBytes`. All of them are signed
 * up front in one go, then sent in order, each confirmed before the next.
 */
export async function sendCardBatches(
  rpc: EstateRpc,
  signer: TransactionSigner,
  ixs: Instruction[],
  maxBytes: number,
): Promise<string[]> {
  if (ixs.length === 0) return [];
  const { value: lifetime } = await rpc.getLatestBlockhash().send();
  const batches = packInstructionsForCard((batch) => messageLen(signer, batch, lifetime), ixs, maxBytes);
  const compiled = batches.map((batch) => compileForCard(signer, batch, lifetime));
  const signed = await signAll(signer, compiled);
  const sigs: string[] = [];
  for (const tx of signed) {
    sigs.push(await sendSigned(rpc, tx));
  }
  return sigs;
}
