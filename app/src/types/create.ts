import type { TransactionSigner } from "@solana/kit";
import type { PlannedMessage, TxFailure } from "@/types/tx";

/** What an asset in the create flow is: native SOL, or a token by its mint. */
export type CreateAssetId = "sol" | (string & {});

/** One transaction the create flow sends, as kit planned it. */
export type CreateEstateTx = {
  /** True for the first transaction, which creates the estate (and its vault). */
  createsEstate: boolean;
  /** The assets this transaction puts in the estate, in instruction order. */
  assets: CreateAssetId[];
  message: PlannedMessage;
};

/** Everything creating one estate takes, split into the transactions the wallet will sign. */
export type CreateEstateDraft = {
  /** The signer the instructions were built with; the same object must sign them. */
  signer: TransactionSigner;
  transactions: CreateEstateTx[];
};

/** Called as each transaction moves on, so the signing modal can follow along. */
export type CreateEstateProgressEvents = {
  onAwaitingSignature: (index: number) => void;
  onSigned: (index: number) => void;
  onConfirmed: (index: number, signature: string) => void;
};

/** Which half of a transaction's journey it's on: the wallet, or the cluster. */
export type SigningStage = "signing" | "confirming";

export type CreateEstateStatus = "running" | "done" | "error";

/** The signing modal's state while an estate is being created. */
export type CreateEstateProgress = {
  status: CreateEstateStatus;
  stage: SigningStage;
  /** The transaction being signed or confirmed, or the one that failed. */
  current: number;
  /** Per transaction, its signature once confirmed. */
  signatures: (string | null)[];
  error: TxFailure | null;
};
