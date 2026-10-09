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
