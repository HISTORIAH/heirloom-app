import { findVaultPda } from "@historiah/heirloom";
import type { Address } from "@solana/kit";

import { useSendIxs } from "@/hooks/tx/useSendIxs";
import { estateSpan } from "@/lib/estate/span";
import { assertAllTokensListed, discoverVaultClaimTokens, estateDelegate } from "@/lib/estate/tokens";
import { readNfcCapability } from "@/lib/nfc/reader";
import { withCardSigningSession } from "@/lib/nfc/signer";
import { runCardClaimAndSweep } from "@/lib/tx/cardClaim";
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

  async function claimWithCard(row: EstateRow, destination: Address): Promise<void> {
    const cap = await readNfcCapability();
    if (cap.status === "unsupported") throw new Error("This phone can’t read credentials.");
    if (cap.status === "disabled") throw new Error("NFC is off. Turn it on, then try again.");
    const skipClaim = estateSpan(row.data, row.claimableLamports).state === "distributed";
    await withCardSigningSession(({ signer }) =>
      runCardClaimAndSweep({
        rpc: client.rpc,
        signer,
        row,
        destination,
        skipClaim,
      }),
    );
  }

  return { account, claimAll, sendHeartbeat, claimWithCard };
}
