import { findEstatePda } from "@historiah/heirloom";

import type { EstateTimingFields } from "@/types/estate";
import type { Address } from "@solana/kit";
import { useSendIxs } from "./tx/useSendIxs";
import { CreateEstateInput, EstateRow } from "@/types/program";
import {
  assertEstateFree,
  buildCheckInIx,
  buildCreateEstateIxs,
  buildReassignIxs,
  buildRegisterTokenIx,
  buildRevokeAllIxs,
  buildTopUpSolIx,
  buildUpdateFieldIx,
} from "@/lib";

export function useOwnerTx() {
  const { account, client, sendIxs } = useSendIxs();

  async function checkIn(heir: CreateEstateInput["heir"]): Promise<string> {
    return sendIxs(async (signer) => [await buildCheckInIx(signer, signer.address, heir)]);
  }

  /** One transaction, one signature. Keep it to a handful: each estate adds an instruction. */
  async function checkInAll(heirs: CreateEstateInput["heir"][]): Promise<string> {
    return sendIxs((signer) =>
      Promise.all(heirs.map((heir) => buildCheckInIx(signer, signer.address, heir))),
    );
  }

  async function topUpSol(heir: CreateEstateInput["heir"], lamports: bigint): Promise<string> {
    if (lamports <= 0n) throw new Error("Enter a SOL amount");
    return sendIxs(async (signer) => {
      return [await buildTopUpSolIx(signer, heir, lamports)];
    });
  }

  async function createEstate(
    input: CreateEstateInput,
  ): Promise<{ signature: string; estatePda: Address }> {
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
    return sendIxs(async (signer) => [
      buildUpdateFieldIx(signer, row.data.heir, row.address, fields),
    ]);
  }

  async function addToken(row: EstateRow, mint: Address, amount: bigint): Promise<string> {
    return sendIxs(async (signer) => [
      await buildRegisterTokenIx(client.rpc, signer, row.data.heir, mint, amount),
    ]);
  }

  return {
    account,
    checkIn,
    checkInAll,
    topUpSol,
    createEstate,
    reassignHeir,
    closeEstate,
    updateSettings,
    addToken,
  };
}
