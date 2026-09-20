import { useSendIxs } from "@/hooks/useSendIxs";
import {
  assertEstateFree,
  buildCreateEstateIxs,
  buildHeartbeatIx,
  buildTopUpSolIx,
  findVaultPda,
  type CreateEstateInput,
} from "@/lib/ownerWrites";

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

  return { account, checkIn, topUpSol, createEstate };
}
