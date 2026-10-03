import { fetchMaybeAssetRecord, findAssetRecordPda, TREASURY_ADDRESS, type Estate } from "@historiah/heirloom";
import { address, type Address } from "@solana/kit";

import { TOKEN_PROGRAMS } from "@/constants/solana";
import { findAtaPda } from "@/lib/solana/ata";
import { unwrapOption } from "@/lib/solana/option";
import { parsedTokenAccount, toBigInt } from "@/lib/solana/parsed";
import type { ClaimToken, EstateRpc, VaultToken } from "@/types/program";

/** `claimableAssets` counts SOL as one asset; the rest are registered tokens. */
export function registeredTokenCount(claimableAssets: number): number {
  return claimableAssets <= 1 ? 0 : claimableAssets - 1;
}

/** Throws if the RPC listed fewer vault tokens than the estate has registered. */
export function assertAllTokensListed(found: number, claimableAssets: number): void {
  if (found < registeredTokenCount(claimableAssets)) {
    throw new Error("This estate still has tokens, but this RPC did not list them all. Try again later.");
  }
}

export function estateDelegate(estate: Estate): Address | undefined {
  const raw = unwrapOption(estate.delegate);
  return raw === null || raw.length === 0 ? undefined : address(raw);
}

function safeAddress(value: unknown): Address | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;
  try {
    return address(value);
  } catch {
    return undefined;
  }
}

async function maybeVaultToken(
  rpc: EstateRpc,
  vaultAccount: { pubkey: Address; account: { data: unknown; owner: Address } },
  estate: Address,
): Promise<VaultToken | undefined> {
  const parsed = parsedTokenAccount(vaultAccount.account.data);
  const tokenProgram = safeAddress(vaultAccount.account.owner);
  const mint = safeAddress(parsed?.mint);
  const amount = toBigInt(parsed?.amount);
  if (tokenProgram === undefined || mint === undefined || amount === undefined || amount <= 0n) return undefined;

  const [assetRecord] = await findAssetRecordPda({ estate, mint });
  const maybe = await fetchMaybeAssetRecord(rpc, assetRecord);
  if (!maybe.exists) return undefined;
  if (maybe.data.hasProtectedExposure || maybe.data.hasBoostedExposure) {
    throw new Error("This estate still has yield deployed. Recall it on the web app first.");
  }
  return { mint, vaultTokenAccount: vaultAccount.pubkey, tokenProgram, assetRecord };
}

/** Every registered, non-empty token in an estate's vault. */
export async function discoverVaultRegisteredTokens(
  rpc: EstateRpc,
  vault: Address,
  estate: Address,
): Promise<VaultToken[]> {
  const groups = await Promise.all(
    TOKEN_PROGRAMS.map((programId) =>
      rpc.getTokenAccountsByOwner(vault, { programId }, { encoding: "jsonParsed" }).send(),
    ),
  );
  const found: VaultToken[] = [];
  for (const group of groups) {
    for (const item of group.value) {
      const tok = await maybeVaultToken(rpc, item, estate);
      if (tok !== undefined) found.push(tok);
    }
  }
  return found;
}

/** Vault tokens plus the heir and treasury accounts a claim pays into. */
export async function discoverVaultClaimTokens(
  rpc: EstateRpc,
  vault: Address,
  estate: Address,
  heir: Address,
): Promise<ClaimToken[]> {
  const registered = await discoverVaultRegisteredTokens(rpc, vault, estate);
  return Promise.all(
    registered.map(async (tok) => {
      const [heirTokenAccount, treasuryTokenAccount] = await Promise.all([
        findAtaPda(heir, tok.mint, tok.tokenProgram),
        findAtaPda(TREASURY_ADDRESS, tok.mint, tok.tokenProgram),
      ]);
      return { ...tok, heirTokenAccount, treasuryTokenAccount };
    }),
  );
}
