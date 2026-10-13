import type { Address } from "@solana/kit";
import type { EstateHolding } from "@/types/estate";

/** Claim pays the card. Sweep moves funds off it; keep leaves them there. */
export type CardClaimPlan =
  | { kind: "keep" }
  | { kind: "sweep"; destination: Address };

/** A token sitting on the credential, ready to send onward. */
export type SweepToken = {
  mint: Address;
  source: Address;
  tokenProgram: Address;
  amount: bigint;
  decimals: number;
};

/** SOL or a token on the credential, with DAS labels when we have them. */
export type CardHolding = EstateHolding & {
  token?: SweepToken;
};

export type HeirStepState = "done" | "current" | "next";

/** One step in the heir's "What happens next". */
export type HeirStep = { title: string; body: string; state: HeirStepState };

/** Whether a credential still holds something to send on: not asked yet, asking, or the answer. */
export type Leftover = "idle" | "checking" | "none" | "some";
