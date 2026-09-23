import type { Address } from "@solana/kit";
import type { TokenPosition } from "@/services/holdings";
import type { MintDetails } from "@/services/mints";
import type { CoveredRecord } from "@/services/plans";

/**
 * The health of one covered holding: whether a recovery would go through
 * right now, and if not, why.
 *
 * - `covered` — the plan is still the delegate, with allowance to spare.
 * - `evicted` — another approval replaced the plan, or it was revoked. SPL Token
 *   keeps one delegate per account and raises no error, so this only shows up
 *   by looking. Fixed by re-approving.
 * - `frozen` / `paused` — the issuer froze the account or paused the mint.
 * - `hook-live` — the issuer wired the transfer hook, which recovery refuses.
 * - `clawback-added` — a permanent delegate appeared after coverage began, a
 *   change to custody terms recovery also refuses to proceed through.
 * - `closed` — the covered token account no longer exists.
 */
export type CoverageHealth =
  "covered" | "evicted" | "frozen" | "paused" | "hook-live" | "clawback-added" | "closed";

export interface CoverageInput {
  plan: Address;
  record: CoveredRecord;
  /** The record's source account, or null if it has been closed. */
  position: TokenPosition | null;
  mint: MintDetails;
}

/**
 * Ordered by what the owner should see first. A frozen account comes before an
 * eviction because re-approving a frozen account is impossible; an eviction
 * comes before issuer-side states because it is the one the owner can fix.
 */
export function assessCoverage({ plan, record, position, mint }: CoverageInput): CoverageHealth {
  if (!position) return "closed";
  if (position.frozen) return "frozen";
  if (position.delegate !== plan || position.delegatedAmount < position.amount) return "evicted";
  if (mint.pausable?.paused) return "paused";
  if (mint.transferHook?.programId) return "hook-live";
  if (!record.hadPermanentDelegate && mint.permanentDelegate) return "clawback-added";
  return "covered";
}

/** The same checks `vault_claim` makes, for assets held by a vault plan. */
export function assessVaultAsset({
  record,
  position,
  mint,
}: Omit<CoverageInput, "plan">): CoverageHealth {
  if (!position) return "closed";
  if (position.frozen) return "frozen";
  if (mint.pausable?.paused) return "paused";
  if (mint.transferHook?.programId) return "hook-live";
  if (!record.hadPermanentDelegate && mint.permanentDelegate) return "clawback-added";
  return "covered";
}

/** An eviction the owner can repair with one re-approval. */
export function canReapprove(health: CoverageHealth, mint: MintDetails): boolean {
  return health === "evicted" && !mint.transferHook?.programId;
}
