import type { MintDetails } from "@/services/mints";

/**
 * What an issuer can still do to a holder's position, read from the mint.
 *
 * - `clawback` — a permanent delegate can move tokens out of any account.
 * - `pausable` — the issuer can halt all transfers, including a recovery.
 * - `paused` — and has done so right now.
 * - `freezable` — a freeze authority can freeze individual accounts.
 * - `hook-slot` — a transfer hook is reserved with an authority that could
 *   point it at a program later, without redeploying the mint.
 */
export type RiskFlag = "clawback" | "pausable" | "paused" | "freezable" | "hook-slot";

export function riskFlags(mint: MintDetails): RiskFlag[] {
  const flags: RiskFlag[] = [];
  if (mint.permanentDelegate) flags.push("clawback");
  if (mint.pausable?.paused) flags.push("paused");
  else if (mint.pausable) flags.push("pausable");
  if (mint.freezeAuthority) flags.push("freezable");
  if (mint.transferHook?.authority && !mint.transferHook.programId) flags.push("hook-slot");
  return flags;
}
