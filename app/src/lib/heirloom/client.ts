import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase58Decoder,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  signAndSendTransactionMessageWithSigners,
  type Instruction,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import type { AppRpc, AppRpcSubscriptions } from "@/contexts/WalletContext";
import {
  COMPUTE_UNIT_MARGIN,
  MAX_COMPUTE_UNIT_LIMIT,
  MAX_LOADED_ACCOUNTS_DATA_SIZE,
} from "@/lib/constants";
import type { TxMessageVersion } from "@/types/tx";

export type HeirloomClient = {
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
  /** v1 (4096 bytes) when the connected wallet signs it, otherwise v0 (1232 bytes). */
  transactionVersion: TxMessageVersion;
};

const base58 = getBase58Decoder();

/**
 * A readable reason for a failed simulation. The program's own error log line says the most
 * ("custom program error: 0x…", an Anchor error); otherwise the raw error. RPC errors carry
 * BigInts, which JSON.stringify can't serialize, so they're turned into strings first.
 */
function describeSimulationError(simulation: {
  err: unknown;
  logs?: readonly string[] | null;
}): string {
  // The last matching line is the one closest to the failure.
  const programError = [...(simulation.logs ?? [])]
    .reverse()
    .find((line) => /error|failed/i.test(line));
  if (programError) return programError;
  return JSON.stringify(simulation.err, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

/**
 * Simulates the message and returns the compute units it used, padded by
 * COMPUTE_UNIT_MARGIN. The message must already carry the maximum limit, or the
 * simulation runs out of compute before it can measure anything.
 */
async function measureComputeUnits(
  client: HeirloomClient,
  message: Parameters<typeof compileTransaction>[0],
): Promise<number> {
  const wireTransaction = getBase64EncodedWireTransaction(compileTransaction(message));
  const { value: simulation } = await client.rpc
    .simulateTransaction(wireTransaction, {
      encoding: "base64",
      sigVerify: false,
      replaceRecentBlockhash: true,
    })
    .send();

  if (simulation.err) {
    throw new Error(`Transaction simulation failed: ${describeSimulationError(simulation)}`);
  }
  if (simulation.unitsConsumed == null) return MAX_COMPUTE_UNIT_LIMIT;

  const padded = Math.ceil(Number(simulation.unitsConsumed) * COMPUTE_UNIT_MARGIN);
  return Math.min(padded, MAX_COMPUTE_UNIT_LIMIT);
}

/**
 * Build, sign, and send a transaction with the given instructions.
 * Returns a base58-encoded transaction signature.
 *
 * v1 messages set their own resource limits (both default to zero): the loaded-accounts
 * limit goes to the maximum, and the compute limit is measured by a simulation first.
 * v0 messages are sent as before, with the runtime's default limits.
 */
export async function sendTx(
  client: HeirloomClient,
  feePayer: TransactionSigner,
  ix: Instruction | Instruction[],
): Promise<string> {
  const instructions = Array.isArray(ix) ? ix : [ix];
  const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();

  const baseMessage = pipe(
    createTransactionMessage({ version: client.transactionVersion }),
    (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
  );

  let message = baseMessage;
  if (client.transactionVersion === 1) {
    const withMaxLimits = pipe(
      baseMessage,
      (tx) => setTransactionMessageLoadedAccountsDataSizeLimit(MAX_LOADED_ACCOUNTS_DATA_SIZE, tx),
      (tx) => setTransactionMessageComputeUnitLimit(MAX_COMPUTE_UNIT_LIMIT, tx),
    );
    const computeUnits = await measureComputeUnits(client, withMaxLimits);
    message = setTransactionMessageComputeUnitLimit(computeUnits, withMaxLimits);
  }

  const signatureBytes = await signAndSendTransactionMessageWithSigners(message);
  return base58.decode(signatureBytes);
}

/**
 * Poll until `signature` reaches `commitment`. Throws if the tx failed on-chain or doesn't
 * get there within `timeoutMs`.
 */
async function waitForCommitment(
  client: HeirloomClient,
  signature: string,
  commitment: "confirmed" | "finalized",
  timeoutMs = 90_000,
): Promise<void> {
  const reached = (status: string | null | undefined) =>
    status === "finalized" || (commitment === "confirmed" && status === "confirmed");

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value } = await client.rpc.getSignatureStatuses([signature as Signature]).send();
    const status = value[0];
    if (status?.err) throw new Error("Transaction failed on-chain");
    if (reached(status?.confirmationStatus)) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for the transaction to be ${commitment}`);
}

/** Poll until `signature` reaches `finalized` commitment (~13s after landing). */
export function waitForFinalized(
  client: HeirloomClient,
  signature: string,
  timeoutMs = 90_000,
): Promise<void> {
  return waitForCommitment(client, signature, "finalized", timeoutMs);
}

/**
 * Sends each group of instructions as its own transaction, in order. Each one is confirmed
 * before the next is built, since later groups use accounts the earlier ones create.
 * Returns the signatures in the same order. One wallet approval per group.
 */
export async function sendTxSequence(
  client: HeirloomClient,
  feePayer: TransactionSigner,
  groups: Instruction[][],
): Promise<string[]> {
  const signatures: string[] = [];
  for (const [index, group] of groups.entries()) {
    const signature = await sendTx(client, feePayer, group);
    signatures.push(signature);
    const isLast = index === groups.length - 1;
    if (!isLast) await waitForCommitment(client, signature, "confirmed");
  }
  return signatures;
}
