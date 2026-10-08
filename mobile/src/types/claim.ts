import type { Address } from "@solana/kit";

/** A token sitting on the credential, ready to send onward. */
export type SweepToken = {
  mint: Address;
  source: Address;
  tokenProgram: Address;
  amount: bigint;
  decimals: number;
};
