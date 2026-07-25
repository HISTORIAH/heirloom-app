import {
  decodeEstate,
  fetchMaybeEstate,
  findEstatePda,
  HEIRLOOM_PROGRAM_ADDRESS,
  type Estate,
} from "@historiah/heirloom";
import { type Address, type Base58EncodedBytes, type Base64EncodedBytes, type MaybeAccount } from "@solana/kit";
import type { HeirloomClient } from "./client";

export type EstateAccount = MaybeAccount<Estate>;

export async function fetchEstateByPair(
  client: HeirloomClient,
  authority: Address,
  heir: Address,
): Promise<EstateAccount> {
  const [pda] = await findEstatePda({ authority, heir });
  return fetchMaybeEstate(client.rpc, pda);
}

/**
 * Returns the claimable SOL in a vault (lamports above rent-exempt minimum).
 */
export async function fetchVaultClaimableLamports(
  client: HeirloomClient,
  vaultPda: Address,
): Promise<bigint> {
  const { value } = await client.rpc
    .getAccountInfo(vaultPda, { encoding: "base64", commitment: "confirmed" })
    .send();
  if (!value) return 0n;
  const rentMin = await client.rpc.getMinimumBalanceForRentExemption(value.space).send();
  const balance = value.lamports as unknown as bigint;
  return balance > rentMin ? balance - rentMin : 0n;
}

/**
 * Fetch all Estate accounts where the given address is the authority.
 * Estate layout: discriminator(8) | authority(32) | heir(32) | ...
 */
export async function fetchEstatesByAuthority(
  client: HeirloomClient,
  authority: Address,
): Promise<Array<{ address: Address; data: Estate }>> {
  return fetchEstatesByMemcmp(client, { offset: 8n, addr: authority });
}

/**
 * Fetch all Estate accounts where the given address is the heir.
 * Heir is at offset 40 (8 discriminator + 32 authority).
 */
export async function fetchEstatesByHeir(
  client: HeirloomClient,
  heir: Address,
): Promise<Array<{ address: Address; data: Estate }>> {
  return fetchEstatesByMemcmp(client, { offset: 40n, addr: heir });
}

async function fetchEstatesByMemcmp(
  client: HeirloomClient,
  match: { offset: bigint; addr: Address },
): Promise<Array<{ address: Address; data: Estate }>> {
  const accounts = await client.rpc
    .getProgramAccounts(HEIRLOOM_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        {
          memcmp: {
            offset: 0n,
            bytes: "wRfOPWjh090=" as unknown as Base64EncodedBytes,
            encoding: "base64",
          },
        },
        {
          memcmp: {
            offset: match.offset,
            bytes: match.addr as unknown as Base58EncodedBytes,
            encoding: "base58",
          },
        },
      ],
    })
    .send();

  const out: Array<{ address: Address; data: Estate }> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of accounts as any[]) {
    // Closed accounts hit 0 lamports and are purged on-chain, but indexer-backed
    // RPC providers (e.g. Helius) can serve a stale getProgramAccounts snapshot
    // for a window after closure — skip anything not actually funded.
    if (Number(item.account.lamports) <= 0) continue;

    const b64: string = Array.isArray(item.account.data)
      ? item.account.data[0]
      : item.account.data;
    const binary = atob(b64);
    const raw = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i);

    try {
      const decoded = decodeEstate({
        address: item.pubkey,
        data: raw,
        executable: item.account.executable,
        lamports: item.account.lamports,
        space: BigInt(raw.length),
        programAddress: HEIRLOOM_PROGRAM_ADDRESS,
      });
      out.push({ address: item.pubkey as Address, data: decoded.data });
    } catch {
      // Stale layout or partially-initialized account — skip.
    }
  }
  return out;
}
