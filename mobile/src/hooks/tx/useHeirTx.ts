import { findVaultPda } from "@historiah/heirloom";
import type { Address } from "@solana/kit";

import { useSendIxs } from "@/hooks/tx/useSendIxs";
import { assertAllTokensListed, discoverVaultClaimTokens, estateDelegate } from "@/lib/estate/tokens";
import { buildClaimIxs } from "@/lib/tx/heir";
import { buildCheckInIx } from "@/lib/tx/updateField";
import type { EstateRow } from "@/types/program";

/** Writes signed by someone other than the owner: the heir's claim, the check-in signer's check-in. */
export function useHeirTx() {
  const { account, client, sendIxs } = useSendIxs();

  async function claimAll(row: EstateRow): Promise<string> {
    return sendIxs(async (signer) => {
      const heir = signer.address;
      if (heir !== row.data.heir) throw new Error("This wallet is not the heir on that estate.");
      const [vault] = await findVaultPda({ authority: row.data.authority, heir });
      const tokens = await discoverVaultClaimTokens(client.rpc, vault, row.address, heir);
      assertAllTokensListed(tokens.length, row.data.claimableAssets);
      return buildClaimIxs(signer, {
        authority: row.data.authority,
        estate: row.address,
        vault,
        tokens,
        delegate: estateDelegate(row.data),
      });
    });
  }

  async function sendHeartbeat(owner: Address, heir: Address): Promise<string> {
    return sendIxs(async (signer) => [await buildCheckInIx(signer, owner, heir)]);
  }

  return { account, claimAll, sendHeartbeat };
}
