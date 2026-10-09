import {
  createClient,
  createTransactionMessage,
  createTransactionPlanner,
  fillTransactionMessageProvisoryResourceLimits,
  flattenTransactionPlanResult,
  pipe,
  setTransactionMessageFeePayerSigner,
  type InstructionPlanInput,
  type Signature,
  type TransactionSigner,
} from "@solana/kit";
import { payer } from "@solana/kit-plugin-signer";
import { transactionPlanner } from "@solana/kit-plugin-instruction-plan";
import {
  rpcGetMinimumBalance,
  rpcTransactionPlanSendingExecutor,
  rpcTransactionPlanSigningExecutor,
  solanaRpcConnection,
} from "@solana/kit-plugin-rpc";
import type { AppRpc, AppRpcSubscriptions } from "@/contexts/WalletContext";
import { SOLANA_RPC_ENDPOINT, SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT } from "@/config";
import { MAX_INSTRUCTIONS_PER_TX } from "@/lib/constants";
import type { TxMessageVersion } from "@/types/tx";

export type HeirloomClient = {
  rpc: AppRpc;
  rpcSubscriptions: AppRpcSubscriptions;
  /** v1 (4096 bytes) when the connected wallet signs it, otherwise v0 (1232 bytes). */
  transactionVersion: TxMessageVersion;
};

/**
 * Plans messages the way kit-plugin-rpc's own planner does (fee payer, provisory resource
 * limits the executor later replaces with simulated ones), plus a cap on instructions per
 * transaction, which that plugin doesn't expose. See MAX_INSTRUCTIONS_PER_TX for why.
 */
function createPlanner(feePayer: TransactionSigner, version: TxMessageVersion) {
  return createTransactionPlanner({
    createTransactionMessage: () =>
      pipe(
        createTransactionMessage({ version }),
        (tx) => setTransactionMessageFeePayerSigner(feePayer, tx),
        (tx) => fillTransactionMessageProvisoryResourceLimits(tx),
      ),
    maxInstructionsPerTransaction: MAX_INSTRUCTIONS_PER_TX,
  });
}

/**
 * A kit client that pays and signs with `feePayer` and sends through our RPC. It's
 * kit-plugin-rpc's `solanaRpc` bundle with our planner in place of its default one: the
 * executors simulate each message to set its compute (and, for v1, loaded-accounts) limits,
 * then send it and wait for confirmation.
 */
function createSendingClient(feePayer: TransactionSigner, version: TxMessageVersion) {
  return createClient()
    .use(payer(feePayer))
    .use(
      solanaRpcConnection({
        rpcUrl: SOLANA_RPC_ENDPOINT,
        rpcSubscriptionsUrl: SOLANA_SUBSCRIPTIONS_RPC_ENDPOINT,
      }),
    )
    .use(rpcGetMinimumBalance())
    .use(transactionPlanner(createPlanner(feePayer, version)))
    .use(rpcTransactionPlanSigningExecutor())
    .use(rpcTransactionPlanSendingExecutor());
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
 * Sign, send and confirm `plan` — every instruction one action needs, in order. Kit's planner
 * packs them into as few transactions as fit (byte size and MAX_INSTRUCTIONS_PER_TX), and the
 * executor sends those one after another, so later ones can use accounts earlier ones create.
 * Wrap instructions in `nonDivisibleSequentialInstructionPlan` to keep them together.
 * Returns every signature, in the order sent. One wallet approval per transaction.
 */
export async function sendPlan(
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
  plan: InstructionPlanInput,
): Promise<string> {
  const signatures = await sendPlan(client, feePayer, plan);
  return signatures[signatures.length - 1];
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
