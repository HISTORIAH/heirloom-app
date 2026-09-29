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
