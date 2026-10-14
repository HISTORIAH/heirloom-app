import type { TransactionSigner } from "@solana/kit";

import { sendCardBatches } from "@/lib/card/send";
import { discoverCardTokens, fetchCardSpareLamports } from "@/lib/card/tokens";
import { fetchEstateByAddress } from "@/lib/estate/fetch";
import { estateSpan } from "@/lib/estate/span";
import { requireListedTokens } from "@/lib/estate/tokens";
import { buildSolSweepIx, buildTokenSweepIxs } from "@/lib/tx/cardSweep";
import { buildClaimIxs } from "@/lib/tx/heir";
import type { CardClaimPlan } from "@/types/claim";
import type { EstateRow, EstateRpc, VaultToken } from "@/types/program";

/**
 * A locked card (a PIN on an Heirloom card, or a card with its own access code) is a wallet:
 * its primary CTA is keep, not leftover sweep. GET_STATUS is the source of truth for the PIN.
 */
export function resolveCardClaimPlan(input: {
  locked: boolean;
  plan: CardClaimPlan;
  skipClaim: boolean;
  cashOut: boolean;
}): CardClaimPlan | { kind: "home" } {
  if (input.locked && input.skipClaim && !input.cashOut) return { kind: "home" };
  if (input.locked && !input.cashOut && input.plan.kind === "sweep") return { kind: "keep" };
  return input.plan;
}

type CardClaimInput = {
  rpc: EstateRpc;
  signer: TransactionSigner;
  row: EstateRow;
  /** The estate's vault tokens, as the claim screen loaded them. */
  vaultTokens: VaultToken[] | undefined;
  plan: CardClaimPlan;
  skipClaim: boolean;
  maxMessageBytes: number;
};

async function sendClaimIfNeeded(input: {
  rpc: EstateRpc;
  signer: TransactionSigner;
  row: EstateRow;
  vaultTokens: VaultToken[] | undefined;
  skipClaim: boolean;
  maxMessageBytes: number;
}): Promise<boolean> {
  if (input.skipClaim) return false;
  const span = estateSpan(input.row.data, input.row.claimableLamports);
  if (span.state === "distributed") return false;
  if (span.state !== "claimable") throw new Error("Nothing to claim yet.");

  const tokens = requireListedTokens(input.vaultTokens, input.row.data.claimableAssets);
  const claimIxs = await buildClaimIxs(input.signer, input.row, tokens);
  try {
    await sendCardBatches(input.rpc, input.signer, claimIxs, input.maxMessageBytes);
    return true;
  } catch (cause) {
    const fresh = await fetchEstateByAddress(input.rpc, input.row.address);
    if (
      fresh !== undefined &&
      estateSpan(fresh.data, fresh.claimableLamports).state === "distributed"
    ) {
      return false;
    }
    throw cause;
  }
}

export async function runCardClaim(input: CardClaimInput): Promise<{ claimed: boolean }> {
  const heir = input.signer.address;
  if (heir !== input.row.data.heir) {
    throw new Error("This credential is not the heir on that estate.");
  }
  if (input.plan.kind === "sweep" && input.plan.destination === heir) {
    throw new Error("Pick a wallet that isn’t this credential.");
  }

  const claimed = await sendClaimIfNeeded(input);
  if (input.plan.kind === "keep") return { claimed };

  // The claim just moved tokens onto the card (less the fee), so its balances are read fresh here.
  const tokens = await discoverCardTokens(input.rpc, heir);
  const tokenIxs = await buildTokenSweepIxs(input.signer, input.plan.destination, tokens);
  await sendCardBatches(input.rpc, input.signer, tokenIxs, input.maxMessageBytes);

  const spare = await fetchCardSpareLamports(input.rpc, heir);
  const solIx = buildSolSweepIx(input.signer, input.plan.destination, spare);
  if (solIx !== undefined)
    await sendCardBatches(input.rpc, input.signer, [solIx], input.maxMessageBytes);
  return { claimed };
}
