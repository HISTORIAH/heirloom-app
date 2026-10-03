import { findEstatePda } from "@historiah/heirloom";
import type { Address } from "@solana/kit";

import { useSendIxs } from "@/hooks/tx/useSendIxs";
import { assertEstateFree } from "@/lib/estate/guards";
import { buildReassignIxs, buildRegisterTokenIx, buildRevokeAllIxs } from "@/lib/tx/manage";
import { buildCreateEstateIxs, buildTopUpSolIx, buildTopUpTokenIx } from "@/lib/tx/owner";
import { buildCheckInIx, buildUpdateFieldIx } from "@/lib/tx/updateField";
import type { EstateTimingFields } from "@/types/estate";
import type { CreateEstateInput, EstateRow } from "@/types/program";

/** Every write the estate owner signs. */
export function useOwnerTx() {
  const { account, client, sendIxs } = useSendIxs();

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

  async function topUpToken(heir: Address, mint: Address, amount: bigint): Promise<string> {
    return sendIxs(async (signer) => [await buildTopUpTokenIx(client.rpc, signer, heir, mint, amount)]);
  }

  async function createEstate(input: CreateEstateInput): Promise<{ signature: string; estatePda: Address }> {
    const authority = account?.address;
    if (!authority) throw new Error("Connect a wallet first");
    const [estatePda] = await findEstatePda({ authority, heir: input.heir });
    const signature = await sendIxs(async (signer) => {
      await assertEstateFree(client.rpc, signer.address, input.heir);
      return buildCreateEstateIxs(signer, input);
    });
    return { signature, estatePda };
  }

  async function reassignHeir(row: EstateRow, newHeir: Address): Promise<string> {
    return sendIxs((signer) => buildReassignIxs(client.rpc, signer, row, newHeir));
  }

  async function closeEstate(row: EstateRow): Promise<string> {
    return sendIxs((signer) => buildRevokeAllIxs(client.rpc, signer, row));
  }

  async function updateSettings(row: EstateRow, fields: EstateTimingFields): Promise<string> {
    return sendIxs(async (signer) => [buildUpdateFieldIx(signer, row.data.heir, row.address, fields)]);
  }

  async function addToken(row: EstateRow, mint: Address, amount: bigint): Promise<string> {
    return sendIxs(async (signer) => [await buildRegisterTokenIx(client.rpc, signer, row.data.heir, mint, amount)]);
  }

  return { account, checkIn, checkInAll, topUpSol, topUpToken, createEstate, reassignHeir, closeEstate, updateSettings, addToken };
}
