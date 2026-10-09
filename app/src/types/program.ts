import type { InitializeAsyncInput } from "@historiah/heirloom";
import type { Address } from "@solana/kit";

// Generated input accepts any InstructionAccountInput for heir/mint; we derive
// PDAs from them, so narrow both to plain addresses.
export type InitializeInput = Omit<
  InitializeAsyncInput,
  "authority" | "estate" | "vault" | "heir" | "mint"
> & {
  heir: Address;
  mint?: Address;
};

/** Instruction-trace entries one Heirloom instruction uses, by which asset it moves. */
export type InstructionTraceCost = { token: number; sol: number };
