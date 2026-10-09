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
