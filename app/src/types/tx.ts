import type { SingleTransactionPlan } from "@solana/kit";

/**
 * Where a transaction is in the progress view: waiting on the wallet's approval,
 * waiting on the cluster, finished, or failed.
 */
export type TxStep = "idle" | "approve" | "confirming" | "done" | "error";

export type TxFlowState = {
  step: TxStep;
  txId: string | null;
  error: string | null;
};

/**
 * The transaction format the app builds. v1 allows 4096-byte transactions; v0 is the
 * 1232-byte format for wallets that can't sign v1 yet.
 */
export type TxMessageVersion = 0 | 1;

/** One transaction as kit planned it: fee payer and instructions set, not yet signed. */
export type PlannedMessage = SingleTransactionPlan["message"];

/**
 * Why a transaction failed, in the terms the user is shown: they declined in the wallet,
 * the wallet is short of SOL, it took too long to land, or the program refused it.
 */
export type TxFailureKind = "rejected" | "insufficientSol" | "expired" | "program" | "unknown";

export type TxFailure = {
  kind: TxFailureKind;
  /** The program's own error text, for "program" and "unknown" failures. */
  detail: string | null;
};
