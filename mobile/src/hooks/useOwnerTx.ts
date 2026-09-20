import { useSendIxs } from "@/hooks/useSendIxs";
import {
  assertEstateFree,
  buildCreateEstateIxs,
  buildHeartbeatIx,
  buildTopUpSolIx,
  findVaultPda,
  type CreateEstateInput,
} from "@/lib/ownerWrites";
import {
  buildReassignIxs,
  buildRegisterTokenIx,
  buildRevokeAllIxs,
  buildSettingsIx,
} from "@/lib/manageWrites";
import type { EstateRow } from "@/lib/estates";
import type { Address } from "@solana/kit";

export function useOwnerTx() {
  const { account, client, sendIxs } = useSendIxs();

  async function checkIn(heir: CreateEstateInput["heir"]): Promise<string> {
    return sendIxs(async (signer) => [await buildHeartbeatIx(signer, heir)]);
  }

  async function topUpSol(
    heir: CreateEstateInput["heir"],
    lamports: bigint,
  ): Promise<string> {
    if (lamports <= 0n) throw new Error("Enter a SOL amount");
    return sendIxs(async (signer) => {
      const [vault] = await findVaultPda({ authority: signer.address, heir });
      return [buildTopUpSolIx(signer, vault, lamports)];
    });
  }

  async function createEstate(input: CreateEstateInput): Promise<string> {
    return sendIxs(async (signer) => {
      await assertEstateFree(client.rpc, signer.address, input.heir);
      return buildCreateEstateIxs(signer, input);
    });
  }

  async function reassignHeir(row: EstateRow, newHeir: Address): Promise<string> {
    return sendIxs((signer) => buildReassignIxs(client.rpc, signer, row, newHeir));
  }

  async function closeEstate(row: EstateRow): Promise<string> {
    return sendIxs((signer) => buildRevokeAllIxs(client.rpc, signer, row));
  }

  async function updateSettings(
    row: EstateRow,
    fields: {
      heartbeatInterval?: bigint;
      gracePeriod?: bigint;
      pauseDuration?: bigint;
      label?: string;
    },
  ): Promise<string> {
    return sendIxs(async (signer) => [
      buildSettingsIx(signer, row.data.heir, row.address, fields),
    ]);
  }

  async function addToken(
    row: EstateRow,
    mint: Address,
    amount: bigint,
  ): Promise<string> {
    return sendIxs(async (signer) => [
      await buildRegisterTokenIx(client.rpc, signer, row.data.heir, mint, amount),
    ]);
  }

  return {
    account,
    checkIn,
    topUpSol,
    createEstate,
    reassignHeir,
    closeEstate,
    updateSettings,
    addToken,
  };
}
