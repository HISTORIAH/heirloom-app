import { findEstatePda } from "@historiah/heirloom";
import { useQueryClient } from "@tanstack/react-query";
import type { Address } from "@solana/kit";

import { loadedVaultTokens } from "@/hooks/estate/useEstateHoldings";
import { useSendIxs } from "@/hooks/tx/useSendIxs";
import { assertEstateFree, assertNotPaused } from "@/lib/estate/guards";
import { requireListedTokens } from "@/lib/estate/tokens";
import { toTokenDeposit } from "@/lib/solana/mint";
import { buildReassignIxs, buildRegisterTokenIx, buildRevokeAllIxs } from "@/lib/tx/manage";
import { buildCreateEstateIxs, buildTopUpSolIx, buildTopUpTokenIx } from "@/lib/tx/owner";
import { buildCheckInIx, buildUpdateFieldIx } from "@/lib/tx/updateField";
import type { EstateTimingFields } from "@/types/estate";
import type { CreateEstateInput, EstateRow, PickedDeposit } from "@/types/program";

/**
 * Every write the estate owner signs. lib/tx only builds; what it needs comes from what the
 * screens already loaded: picked tokens from the DAS wallet list, vault tokens from the holdings query.
 */
export function useOwnerTx() {
  const { account, client, sendIxs } = useSendIxs();
  const queryClient = useQueryClient();

  async function checkIn(heir: Address): Promise<string> {
    return sendIxs(async (signer) => [await buildCheckInIx(signer, signer.address, heir)]);
  }

  /** One transaction, one signature. Keep it to a handful: each estate adds an instruction. */
  async function checkInAll(heirs: Address[]): Promise<string> {
    return sendIxs((signer) => Promise.all(heirs.map((heir) => buildCheckInIx(signer, signer.address, heir))));
  }

  async function topUpSol(heir: Address, lamports: bigint): Promise<string> {
    return sendIxs(async (signer) => [await buildTopUpSolIx(signer, heir, lamports)]);
  }

  async function topUpToken(heir: Address, picked: PickedDeposit): Promise<string> {
    const token = await toTokenDeposit(client.rpc, picked);
    return sendIxs(async (signer) => [await buildTopUpTokenIx(signer, heir, token)]);
  }

  async function createEstate(input: CreateEstateInput): Promise<{ signature: string; estatePda: Address }> {
    const authority = account?.address;
    if (!authority) throw new Error("Connect a wallet first");
    const [estatePda] = await findEstatePda({ authority, heir: input.heir });
    const tokens = await Promise.all(
      (input.tokens ?? []).map((picked) => toTokenDeposit(client.rpc, picked)),
    );
    const signature = await sendIxs(async (signer) => {
      // The one read worth its cost: it stops a create that is sure to fail before the user signs.
      await assertEstateFree(client.rpc, signer.address, input.heir);
      return buildCreateEstateIxs(signer, input, tokens);
    });
    return { signature, estatePda };
  }

  async function reassignHeir(row: EstateRow, newHeir: Address): Promise<string> {
    if (newHeir === row.data.heir) throw new Error("That address is already the heir.");
    assertNotPaused(row.data.delegatePauseExpiresAt);
    const tokens = requireListedTokens(loadedVaultTokens(queryClient, row.address), row.data.claimableAssets);
    return sendIxs(async (signer) => {
      await assertEstateFree(client.rpc, signer.address, newHeir);
      return buildReassignIxs(signer, row, newHeir, tokens);
    });
  }

  async function closeEstate(row: EstateRow): Promise<string> {
    const tokens = requireListedTokens(loadedVaultTokens(queryClient, row.address), row.data.claimableAssets);
    return sendIxs((signer) => buildRevokeAllIxs(signer, row, tokens));
  }

  async function updateSettings(row: EstateRow, fields: EstateTimingFields): Promise<string> {
    return sendIxs(async (signer) => [buildUpdateFieldIx(signer, row.data.heir, row.address, fields)]);
  }

  /** A mint the estate doesn't hold yet; the screen decides that from its loaded holdings. */
  async function addToken(row: EstateRow, picked: PickedDeposit): Promise<string> {
    const token = await toTokenDeposit(client.rpc, picked);
    return sendIxs(async (signer) => [await buildRegisterTokenIx(signer, row.data.heir, token)]);
  }

  return { account, checkIn, checkInAll, topUpSol, topUpToken, createEstate, reassignHeir, closeEstate, updateSettings, addToken };
}
