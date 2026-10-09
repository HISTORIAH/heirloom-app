import {
  createClient,
  flattenTransactionPlanResult,
  type Instruction,
  type InstructionPlanInput,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import { payer } from "@solana/kit-plugin-signer";
import { solanaRpc } from "@solana/kit-plugin-rpc";
import type { AppRpc, AppRpcSubscriptions } from "@/contexts/WalletContext";
import { SOLANA_RPC_ENDPOINT, SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT } from "@/config";
import type { TxMessageVersion } from "@/types/tx";

export type HeirloomClient = {
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
  /** v1 (4096 bytes) when the connected wallet signs it, otherwise v0 (1232 bytes). */
  transactionVersion: TxMessageVersion;
};

/**
 * A kit client that pays and signs with `feePayer` and sends through our RPC. Kit's planner
 * builds the message in the requested version, and its executor simulates it to set the
 * compute (and, for v1, loaded-accounts) limits, sends it and waits for confirmation.
 */
function createSendingClient(feePayer: TransactionSigner, version: TxMessageVersion) {
  return createClient()
    .use(payer(feePayer))
    .use(
      solanaRpc({
        rpcUrl: SOLANA_RPC_ENDPOINT,
        rpcSubscriptionsUrl: SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT,
        transactionConfig: version === 1 ? { version: 1 } : { version: 0 },
      }),
    );
}

/** Errors carry the simulation logs somewhere along their `cause` chain, when there are any. */
function findLogs(error: unknown): readonly string[] | undefined {
  let current: unknown = error;
  while (current && typeof current === "object") {
    const context = (current as { context?: { logs?: readonly string[] } }).context;
    if (context?.logs?.length) return context.logs;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/**
 * Kit's production build shortens error messages to codes. The program's own error line from
 * the simulation ("custom program error: 0x…", an Anchor error) says much more, so a failure
 * is re-thrown with that line when there is one.
 */
function withReadableMessage(error: unknown): unknown {
  const programError = [...(findLogs(error) ?? [])]
    .reverse()
    .find((line) => /error|failed/i.test(line));
  if (!programError) return error;
  return Object.assign(new Error(`Transaction failed: ${programError}`), { cause: error });
}

/**
 * Sign, send and confirm `plan`, in order. Kit's planner packs it into as few transactions as
 * fit — it can take more than one if the instructions don't fit together (v0 is 1232 bytes,
 * and kit adds a compute-limit instruction to each v0 message). Wrap instructions in
 * `nonDivisibleSequentialInstructionPlan` to keep them in the same transaction.
 * Returns every signature, in the order sent. One wallet approval per transaction.
 */
async function sendPlan(
  client: HeirloomClient,
  feePayer: TransactionSigner,
  plan: InstructionPlanInput,
): Promise<string[]> {
  try {
    const result = await createSendingClient(feePayer, client.transactionVersion).sendTransactions(
      plan,
    );
    return flattenTransactionPlanResult(result).map((single) => {
      if (single.status !== "successful") throw new Error("Transaction was not sent");
      return single.context.signature;
    });
  } catch (error) {
    throw withReadableMessage(error);
  }
}

/**
 * Sign, send and confirm the given instructions. Returns the signature of the last
 * transaction, the one that completes the action.
 */
export async function sendTx(
  client: HeirloomClient,
  feePayer: TransactionSigner,
  ix: Instruction | Instruction[],
): Promise<string> {
  const signatures = await sendPlan(client, feePayer, ix);
  return signatures[signatures.length - 1];
}

/**
 * Sends each group as its own step, in order; each is confirmed before the next starts, so
 * later groups can use accounts the earlier ones create. Groups bound how much goes into one
 * transaction (the 64-instruction trace limit); kit may still split a group to fit the size.
 * Returns every signature, in the order sent.
 */
export async function sendTxSequence(
  client: HeirloomClient,
  feePayer: TransactionSigner,
  groups: InstructionPlanInput[],
): Promise<string[]> {
  const signatures: string[] = [];
  for (const group of groups) {
    signatures.push(...(await sendPlan(client, feePayer, group)));
  }
  return signatures;
}

/**
 * Poll until `signature` reaches `finalized` commitment (~13s after landing). Registration
 * waits for this, since the backend reads the create tx at that commitment.
 */
export async function waitForFinalized(
  client: HeirloomClient,
  signature: string,
  timeoutMs = 90_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { value } = await client.rpc.getSignatureStatuses([signature as Signature]).send();
    const status = value[0];
    if (status?.err) throw new Error("Transaction failed on-chain");
    if (status?.confirmationStatus === "finalized") return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for transaction finalization");
}
