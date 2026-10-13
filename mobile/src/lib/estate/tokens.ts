import { fetchAllMaybeAssetRecord, findAssetRecordPda, type Estate } from "@historiah/heirloom";
import { address, type Address } from "@solana/kit";

import { TOKEN_PROGRAMS } from "@/constants/solana";
import { safeAddress } from "@/lib/solana/address";
import { unwrapOption } from "@/lib/solana/option";
import { parsedTokenAccount, toBigInt } from "@/lib/solana/parsed";
import type { EstateRpc, VaultToken } from "@/types/program";

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

/**
 * The vault tokens a screen already loaded, checked against the estate's own count.
 * `undefined` means they haven't loaded (or failed), so there is nothing safe to build with.
 */
export function requireListedTokens(tokens: VaultToken[] | undefined, claimableAssets: number): VaultToken[] {
  if (tokens === undefined) {
    if (registeredTokenCount(claimableAssets) === 0) return [];
    throw new Error("This estate's tokens are still loading. Try again in a moment.");
  }
  assertAllTokensListed(tokens.length, claimableAssets);
  return tokens;
}

export function estateDelegate(estate: Estate): Address | undefined {
  const raw = unwrapOption(estate.delegate);
  return raw === null || raw.length === 0 ? undefined : address(raw);
}

type VaultTokenAccount = { pubkey: Address; account: { data: unknown; owner: Address } };

/** A non-empty token account in the vault, before we know it is registered. */
function heldVaultToken(item: VaultTokenAccount): Omit<VaultToken, "assetRecord"> | undefined {
  const parsed = parsedTokenAccount(item.account.data);
  const tokenProgram = safeAddress(item.account.owner);
  const mint = safeAddress(parsed?.mint);
  const amount = toBigInt(parsed?.amount);
  const decimals = parsed?.decimals;
  if (tokenProgram === undefined || mint === undefined || amount === undefined || amount <= 0n) return undefined;
  if (decimals === undefined) return undefined;
  return { mint, vaultTokenAccount: item.pubkey, tokenProgram, amount, decimals };
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
  const held = groups
    .flatMap((group) => group.value.map(heldVaultToken))
    .filter((tok) => tok !== undefined);
  if (held.length === 0) return [];

  const assetRecords = await Promise.all(
    held.map(async (tok) => (await findAssetRecordPda({ estate, mint: tok.mint }))[0]),
  );
  // One getMultipleAccounts for every asset record, not one call per token.
  const records = await fetchAllMaybeAssetRecord(rpc, assetRecords);
  const registered: VaultToken[] = [];
  for (const [i, tok] of held.entries()) {
    const record = records[i];
    if (record === undefined || !record.exists) continue;
    if (record.data.hasProtectedExposure || record.data.hasBoostedExposure) {
      throw new Error("This estate still has yield deployed. Recall it on the web app first.");
    }
    registered.push({ ...tok, assetRecord: record.address });
  }
  return registered;
}
