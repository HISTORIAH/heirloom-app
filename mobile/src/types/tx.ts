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
