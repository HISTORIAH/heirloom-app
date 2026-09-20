import type { Address, TransactionSigner } from "@solana/kit";

import { useSendIxs } from "@/hooks/useSendIxs";
import type { EstateRow } from "@/lib/estates";
import {
  buildClaimIxs,
  buildSignerHeartbeatIx,
  discoverVaultClaimTokens,
  estateDelegate,
  findVaultPda,
  registeredTokenCount,
} from "@/lib/heirWrites";

export function useHeirTx() {
  const { account, client, sendIxs } = useSendIxs();

  async function claimAll(row: EstateRow): Promise<string> {
    return sendIxs(async (signer: TransactionSigner) => {
      const heir = signer.address;
      if (heir !== row.data.heir) {
        throw new Error("This wallet is not the heir on that estate.");
      }
      const [vault] = await findVaultPda({
        authority: row.data.authority,
        heir: row.data.heir,
      });
      const tokens = await discoverVaultClaimTokens(
        client.rpc,
        vault,
        row.address,
        heir,
      );
      const need = registeredTokenCount(row.data.claimableAssets);
      if (tokens.length < need) {
        throw new Error(
          "This vault still has tokens, but this RPC did not list them all. Try again later.",
        );
      }
      return buildClaimIxs(signer, {
        authority: row.data.authority,
        estate: row.address,
        vault,
        tokens,
        delegate: estateDelegate(row.data),
      });
    });
  }

  async function sendHeartbeat(
    estateAuthority: Address,
    heir: Address,
  ): Promise<string> {
    return sendIxs(async (signer) => [
      await buildSignerHeartbeatIx(signer, estateAuthority, heir),
    ]);
  }

  return { account, claimAll, sendHeartbeat };
}
