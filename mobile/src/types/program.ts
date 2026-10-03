import type { Estate } from "@historiah/heirloom";
import type { Address, Rpc, SolanaRpcApi } from "@solana/kit";

/** Types built on the generated Heirloom client. */

export type EstateRpc = Rpc<SolanaRpcApi>;

/** One estate account plus what its vault can pay out. */
export type EstateRow = {
  address: Address;
  data: Estate;
  claimableLamports: bigint;
  /** Off-chain label from the backend. Falls back to a truncated address when absent. */
  label?: string;
};

/** How a wallet relates to an estate; each maps to an account field we filter on. */
export type EstateRole = "authority" | "heir" | "checkInSigner" | "delegate";

export type CreateEstateInput = {
  heir: Address;
  /** Off-chain display name. Sent to the backend via SPL Memo in the create tx. */
  label: string;
  checkInIntervalSecs: bigint;
  gracePeriodSecs: bigint;
  amountLamports: bigint;
  delegate?: Address;
  checkInSigner?: Address;
  fundHeir?: boolean;
  delegatePauseDurationSecs?: bigint;
};

/** A registered token sitting in an estate's vault. */
export type VaultToken = {
  mint: Address;
  vaultTokenAccount: Address;
  tokenProgram: Address;
  assetRecord: Address;
  /** Raw units held in the vault. */
  amount: bigint;
  decimals: number;
};

/** A vault token plus the accounts a claim pays into. */
export type ClaimToken = VaultToken & {
  heirTokenAccount: Address;
  treasuryTokenAccount: Address;
};

export type MintMeta = { decimals: number; tokenProgram: Address };
