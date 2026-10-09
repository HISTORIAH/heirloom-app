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
