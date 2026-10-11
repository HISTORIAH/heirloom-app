import { findVaultPda } from "@historiah/heirloom";
import type { TransactionSigner } from "@solana/kit";

import { fetchEstateByAddress } from "@/lib/estate/fetch";
import { estateSpan } from "@/lib/estate/span";
import { assertAllTokensListed, discoverVaultClaimTokens, estateDelegate } from "@/lib/estate/tokens";
import { sendCardBatches } from "@/lib/tx/cardSend";
import {
  buildSolSweepIx,
  buildTokenSweepIxs,
  discoverCardTokens,
  spareLamports,
} from "@/lib/tx/cardSweep";
import { buildClaimIxs } from "@/lib/tx/heir";
import type { CardClaimPlan } from "@/types/claim";
import type { EstateRow, EstateRpc } from "@/types/program";

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

async function sendClaimIfNeeded(input: {
  rpc: EstateRpc;
  signer: TransactionSigner;
  row: EstateRow;
  skipClaim: boolean;
  maxMessageBytes: number;
}): Promise<boolean> {
  if (input.skipClaim) return false;
  const span = estateSpan(input.row.data, input.row.claimableLamports);
  if (span.state === "distributed") return false;
  if (span.state !== "claimable") throw new Error("Nothing to claim yet.");

  const heir = input.signer.address;
  const [vault] = await findVaultPda({ authority: input.row.data.authority, heir });
  const tokens = await discoverVaultClaimTokens(input.rpc, vault, input.row.address, heir);
  assertAllTokensListed(tokens.length, input.row.data.claimableAssets);
  const claimIxs = await buildClaimIxs(input.signer, {
    authority: input.row.data.authority,
    estate: input.row.address,
    vault,
    tokens,
    delegate: estateDelegate(input.row.data),
  });
  try {
    await sendCardBatches(input.rpc, input.signer, claimIxs, input.maxMessageBytes);
    return true;
  } catch (cause) {
    const fresh = await fetchEstateByAddress(input.rpc, input.row.address);
    if (fresh !== undefined && estateSpan(fresh.data, fresh.claimableLamports).state === "distributed") {
      return false;
    }
    throw cause;
  }
}

export async function runCardClaim(input: {
  rpc: EstateRpc;
  signer: TransactionSigner;
  row: EstateRow;
  plan: CardClaimPlan;
  skipClaim: boolean;
  maxMessageBytes: number;
}): Promise<{ claimed: boolean }> {
  const heir = input.signer.address;
  if (heir !== input.row.data.heir) {
    throw new Error("This credential is not the heir on that estate.");
  }
  if (input.plan.kind === "sweep" && input.plan.destination === heir) {
    throw new Error("Pick a wallet that isn’t this credential.");
  }

  const claimed = await sendClaimIfNeeded(input);
  if (input.plan.kind === "keep") return { claimed };

  const tokens = await discoverCardTokens(input.rpc, heir);
  const tokenIxs = await buildTokenSweepIxs(input.signer, input.plan.destination, tokens);
  await sendCardBatches(input.rpc, input.signer, tokenIxs, input.maxMessageBytes);

  const [bal, rent] = await Promise.all([
    input.rpc.getBalance(heir).send(),
    input.rpc.getMinimumBalanceForRentExemption(0n).send(),
  ]);
  const solIx = buildSolSweepIx(
    input.signer,
    input.plan.destination,
    spareLamports(BigInt(bal.value), BigInt(rent)),
  );
  if (solIx !== undefined) await sendCardBatches(input.rpc, input.signer, [solIx], input.maxMessageBytes);
  return { claimed };
}
